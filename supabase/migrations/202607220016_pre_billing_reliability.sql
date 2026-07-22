-- Pre-billing reliability: private temporary Rita files, web push registration,
-- and one RLS-safe cross-category search endpoint. Rerunnable and non-destructive.
begin;

update storage.buckets
set public = false,
    file_size_limit = 26214400,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/x-hwp', 'application/haansofthwp',
      'application/vnd.hancom.hwpx', 'application/hwp+zip',
      'text/plain', 'text/markdown', 'text/csv',
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4',
      'audio/m4a', 'audio/x-m4a', 'audio/ogg', 'audio/webm'
    ]
where id = 'rita-attachments';

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  user_agent text not null default '',
  enabled boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;
drop policy if exists push_subscriptions_own_rows on public.push_subscriptions;
create policy push_subscriptions_own_rows on public.push_subscriptions
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists push_subscriptions_touch_updated_at on public.push_subscriptions;
create trigger push_subscriptions_touch_updated_at before update on public.push_subscriptions
for each row execute function public.touch_updated_at();

revoke all on public.push_subscriptions from public, anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;

create table if not exists public.push_deliveries (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'delivered', 'failed')),
  attempts integer not null default 0,
  claimed_at timestamptz,
  delivered_at timestamptz,
  last_error text,
  primary key (notification_id, subscription_id)
);
alter table public.push_deliveries enable row level security;
revoke all on public.push_deliveries from public, anon, authenticated;
grant all on public.push_deliveries to service_role;

create or replace function public.claim_push_deliveries(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare result jsonb;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  insert into public.push_deliveries(notification_id, subscription_id)
  select notification.id, subscription.id
  from public.notifications notification
  join public.push_subscriptions subscription on subscription.user_id = notification.user_id and subscription.enabled
  where coalesce(notification.scheduled_for, notification.created_at) <= now()
    and notification.created_at >= now() - interval '7 days'
  on conflict do nothing;

  with picked as (
    select delivery.notification_id, delivery.subscription_id
    from public.push_deliveries delivery
    where delivery.attempts < 5 and (
      delivery.status = 'pending' or
      (delivery.status = 'processing' and delivery.claimed_at < now() - interval '10 minutes')
    )
    order by delivery.notification_id
    for update skip locked
    limit least(200, greatest(1, coalesce(p_limit, 100)))
  ), claimed as (
    update public.push_deliveries delivery
    set status = 'processing', attempts = delivery.attempts + 1, claimed_at = now()
    from picked
    where delivery.notification_id = picked.notification_id and delivery.subscription_id = picked.subscription_id
    returning delivery.notification_id, delivery.subscription_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'notificationId', notification.id, 'subscriptionId', subscription.id,
    'title', notification.title, 'body', notification.body,
    'path', case notification.related_entity_type
      when 'calendar_event' then '/calendar/event/' || notification.related_entity_id::text
      when 'quest' then '/office'
      else '/notifications' end,
    'endpoint', subscription.endpoint, 'p256dh', subscription.p256dh, 'auth', subscription.auth_key
  )), '[]'::jsonb) into result
  from claimed
  join public.notifications notification on notification.id = claimed.notification_id
  join public.push_subscriptions subscription on subscription.id = claimed.subscription_id;
  return result;
end;
$$;

revoke all on function public.claim_push_deliveries(integer) from public, anon, authenticated;
grant execute on function public.claim_push_deliveries(integer) to service_role;

create or replace function public.schedule_my_reminder(
  p_entity_type text,
  p_entity_id uuid,
  p_title text,
  p_scheduled_for timestamptz
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare owner_id uuid := auth.uid(); reminder_id uuid;
begin
  if owner_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_entity_type not in ('calendar_event', 'quest') then raise exception 'invalid_entity_type' using errcode = '22023'; end if;
  if p_scheduled_for < now() - interval '5 minutes' or p_scheduled_for > now() + interval '1 year' then
    raise exception 'invalid_reminder_time' using errcode = '22023';
  end if;
  if p_entity_type = 'calendar_event' and not exists (select 1 from public.calendar_events where id = p_entity_id and user_id = owner_id) then
    raise exception 'entity_not_found' using errcode = 'P0002';
  end if;
  if p_entity_type = 'quest' and not exists (select 1 from public.quests where id = p_entity_id and user_id = owner_id) then
    raise exception 'entity_not_found' using errcode = 'P0002';
  end if;
  delete from public.notifications where user_id = owner_id and kind = 'reminder'
    and related_entity_type = p_entity_type and related_entity_id = p_entity_id and read_at is null;
  insert into public.notifications(user_id, title, body, kind, related_entity_type, related_entity_id, scheduled_for)
  values (owner_id, '왕실 일정 알림', left(coalesce(nullif(btrim(p_title), ''), '확인할 일정이 있어요.'), 300), 'reminder', p_entity_type, p_entity_id, p_scheduled_for)
  returning id into reminder_id;
  return reminder_id;
end;
$$;

revoke all on function public.schedule_my_reminder(text, uuid, text, timestamptz) from public, anon;
grant execute on function public.schedule_my_reminder(text, uuid, text, timestamptz) to authenticated, service_role;

create index if not exists main_quests_owner_search_idx on public.main_quests
using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(memo, '')));
create index if not exists quests_owner_search_idx on public.quests
using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(memo, '')));
create index if not exists calendar_events_owner_search_idx on public.calendar_events
using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')));
create index if not exists memos_owner_search_idx on public.memos
using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, '')));
create index if not exists relationships_owner_search_idx on public.relationships
using gin (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(organization, '') || ' ' || coalesce(notes, '')));
create index if not exists diary_entries_owner_search_idx on public.diary_entries
using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body, '')));

create or replace function public.search_my_kingdom(
  p_query text,
  p_limit integer default 20,
  p_offset integer default 0
) returns jsonb
language sql
security invoker
set search_path = public, pg_temp
stable
as $$
  with input as (
    select websearch_to_tsquery('simple', left(btrim(coalesce(p_query, '')), 120)) query,
           least(20, greatest(1, coalesce(p_limit, 20))) page_size,
           greatest(0, coalesce(p_offset, 0)) page_offset
  ), matches as (
    select 'project'::text kind, id, title, description summary, updated_at, '/office/projects/' || id::text path,
           ts_rank(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(memo, '')), input.query) rank
    from public.main_quests, input where user_id = auth.uid() and input.query @@ to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(memo, ''))
    union all
    select kind::text || '_quest', id, title, description, updated_at, '/office',
           ts_rank(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(memo, '')), input.query)
    from public.quests, input where user_id = auth.uid() and input.query @@ to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(memo, ''))
    union all
    select 'calendar', id, title, description, updated_at, '/calendar/event/' || id::text,
           ts_rank(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')), input.query)
    from public.calendar_events, input where user_id = auth.uid() and input.query @@ to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
    union all
    select 'memo', id, title, left(content, 500), updated_at, '/library/memos/' || id::text,
           ts_rank(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, '')), input.query)
    from public.memos, input where user_id = auth.uid() and input.query @@ to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
    union all
    select 'relationship', id, name, concat_ws(' ', organization, position, notes), updated_at, '/library/relationships/' || id::text,
           ts_rank(to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(organization, '') || ' ' || coalesce(notes, '')), input.query)
    from public.relationships, input where user_id = auth.uid() and input.query @@ to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(organization, '') || ' ' || coalesce(notes, ''))
    union all
    select 'diary', id, title, left(body, 500), updated_at, '/diary/' || entry_date::text,
           ts_rank(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body, '')), input.query)
    from public.diary_entries, input where user_id = auth.uid() and input.query @@ to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body, ''))
  ), counted as (select count(*) total from matches), page as (
    select * from matches order by rank desc, updated_at desc
    limit (select page_size from input) offset (select page_offset from input)
  )
  select jsonb_build_object('items', coalesce(jsonb_agg(to_jsonb(page) - 'rank'), '[]'::jsonb), 'total', (select total from counted)) from page;
$$;

revoke all on function public.search_my_kingdom(text, integer, integer) from public, anon;
grant execute on function public.search_my_kingdom(text, integer, integer) to authenticated, service_role;

commit;
