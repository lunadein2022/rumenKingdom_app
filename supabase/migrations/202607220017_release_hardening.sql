-- Release hardening: reminder lifecycle, native push registrations, real server pages,
-- operational health metrics, and the shared 0.6.0 patch note.
begin;

alter table public.push_subscriptions add column if not exists enabled_at timestamptz not null default now();
create index if not exists notifications_due_global_idx on public.notifications(scheduled_for, created_at) where read_at is null;
create index if not exists push_deliveries_claim_idx on public.push_deliveries(status, attempts, claimed_at);

create or replace function public.cancel_my_reminders(p_entity_type text, p_entity_id uuid)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare owner_id uuid := auth.uid(); removed integer;
begin
  if owner_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_entity_type not in ('calendar_event', 'quest') then raise exception 'invalid_entity_type' using errcode = '22023'; end if;
  delete from public.notifications where user_id = owner_id and kind = 'reminder'
    and related_entity_type = p_entity_type and related_entity_id = p_entity_id and read_at is null;
  get diagnostics removed = row_count;
  return removed;
end;
$$;

create or replace function public.replace_my_reminders(p_entity_type text, p_entity_id uuid, p_reminders jsonb)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare owner_id uuid := auth.uid(); item jsonb; inserted integer := 0; scheduled timestamptz;
begin
  if owner_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_entity_type not in ('calendar_event', 'quest') then raise exception 'invalid_entity_type' using errcode = '22023'; end if;
  if jsonb_typeof(coalesce(p_reminders, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_reminders, '[]'::jsonb)) > 64 then
    raise exception 'invalid_reminder_list' using errcode = '22023';
  end if;
  if p_entity_type = 'calendar_event' and not exists (select 1 from public.calendar_events where id = p_entity_id and user_id = owner_id) then
    raise exception 'entity_not_found' using errcode = 'P0002';
  end if;
  if p_entity_type = 'quest' and not exists (select 1 from public.quests where id = p_entity_id and user_id = owner_id) then
    raise exception 'entity_not_found' using errcode = 'P0002';
  end if;
  perform public.cancel_my_reminders(p_entity_type, p_entity_id);
  for item in select value from jsonb_array_elements(coalesce(p_reminders, '[]'::jsonb)) loop
    begin scheduled := (item->>'scheduled_for')::timestamptz;
    exception when others then raise exception 'invalid_reminder_time' using errcode = '22023'; end;
    if scheduled <= now() or scheduled > now() + interval '1 year 1 day' then
      raise exception 'invalid_reminder_time' using errcode = '22023';
    end if;
    insert into public.notifications(user_id, title, body, kind, related_entity_type, related_entity_id, scheduled_for)
    values (owner_id, left(coalesce(nullif(btrim(item->>'title'), ''), '왕실 알림'), 120),
      left(coalesce(nullif(btrim(item->>'body'), ''), '확인할 기록이 있어요.'), 300),
      'reminder', p_entity_type, p_entity_id, scheduled);
    inserted := inserted + 1;
  end loop;
  return inserted;
end;
$$;

revoke all on function public.cancel_my_reminders(text, uuid), public.replace_my_reminders(text, uuid, jsonb) from public, anon;
grant execute on function public.cancel_my_reminders(text, uuid), public.replace_my_reminders(text, uuid, jsonb) to authenticated, service_role;

create or replace function public.remove_entity_reminders_on_delete() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from public.notifications where user_id = old.user_id and kind = 'reminder'
    and related_entity_type = tg_argv[0] and related_entity_id = old.id;
  return old;
end;
$$;
drop trigger if exists calendar_events_remove_reminders on public.calendar_events;
create trigger calendar_events_remove_reminders after delete on public.calendar_events
for each row execute function public.remove_entity_reminders_on_delete('calendar_event');
drop trigger if exists quests_remove_reminders on public.quests;
create trigger quests_remove_reminders after delete on public.quests
for each row execute function public.remove_entity_reminders_on_delete('quest');

create or replace function public.claim_push_deliveries(p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare result jsonb;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then raise exception 'service_role_required' using errcode = '42501'; end if;
  insert into public.push_deliveries(notification_id, subscription_id)
  select notification.id, subscription.id from public.notifications notification
  join public.push_subscriptions subscription on subscription.user_id = notification.user_id and subscription.enabled
  where coalesce(notification.scheduled_for, notification.created_at) <= now()
    and coalesce(notification.scheduled_for, notification.created_at) >= subscription.enabled_at - interval '1 minute'
    and notification.read_at is null and notification.created_at >= now() - interval '7 days'
  on conflict do nothing;
  with picked as (
    select delivery.notification_id, delivery.subscription_id from public.push_deliveries delivery
    where delivery.attempts < 5 and (delivery.status = 'pending' or (delivery.status = 'processing' and delivery.claimed_at < now() - interval '10 minutes'))
    order by delivery.notification_id for update skip locked limit least(200, greatest(1, coalesce(p_limit, 100)))
  ), claimed as (
    update public.push_deliveries delivery set status = 'processing', attempts = delivery.attempts + 1, claimed_at = now()
    from picked where delivery.notification_id = picked.notification_id and delivery.subscription_id = picked.subscription_id
    returning delivery.notification_id, delivery.subscription_id, delivery.attempts
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'notificationId', notification.id, 'subscriptionId', subscription.id, 'attempts', claimed.attempts,
    'title', notification.title, 'body', notification.body,
    'path', case notification.related_entity_type when 'calendar_event' then '/calendar/event/' || notification.related_entity_id::text when 'quest' then '/office' else '/notifications' end,
    'endpoint', subscription.endpoint, 'p256dh', subscription.p256dh, 'auth', subscription.auth_key
  )), '[]'::jsonb) into result from claimed
  join public.notifications notification on notification.id = claimed.notification_id
  join public.push_subscriptions subscription on subscription.id = claimed.subscription_id;
  return result;
end;
$$;
revoke all on function public.claim_push_deliveries(integer) from public, anon, authenticated;
grant execute on function public.claim_push_deliveries(integer) to service_role;

create table if not exists public.native_push_devices (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')), token text not null, enabled boolean not null default true,
  enabled_at timestamptz not null default now(), app_version text not null default '', locale text not null default 'ko-KR',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id, platform, token)
);
alter table public.native_push_devices enable row level security;
drop policy if exists native_push_devices_own_rows on public.native_push_devices;
create policy native_push_devices_own_rows on public.native_push_devices for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
revoke all on public.native_push_devices from public, anon;
grant select, insert, update, delete on public.native_push_devices to authenticated;
grant all on public.native_push_devices to service_role;

create table if not exists public.native_push_deliveries (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  device_id uuid not null references public.native_push_devices(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','processing','delivered','failed')),
  attempts integer not null default 0, claimed_at timestamptz, delivered_at timestamptz, last_error text,
  primary key(notification_id, device_id)
);
alter table public.native_push_deliveries enable row level security;
revoke all on public.native_push_deliveries from public, anon, authenticated;
grant all on public.native_push_deliveries to service_role;
create index if not exists native_push_deliveries_claim_idx on public.native_push_deliveries(status, attempts, claimed_at);

create or replace function public.register_my_native_push_device(p_platform text, p_token text, p_app_version text default '', p_locale text default 'ko-KR')
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare owner_id uuid := auth.uid(); result uuid;
begin
  if owner_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_platform not in ('ios','android') or char_length(btrim(p_token)) not between 16 and 4096 then raise exception 'invalid_device' using errcode = '22023'; end if;
  insert into public.native_push_devices(user_id, platform, token, enabled, enabled_at, app_version, locale)
  values(owner_id, p_platform, btrim(p_token), true, now(), left(p_app_version,40), left(p_locale,20))
  on conflict(user_id, platform, token) do update set enabled = true, enabled_at = now(), app_version = excluded.app_version, locale = excluded.locale, updated_at = now()
  returning id into result; return result;
end;
$$;
revoke all on function public.register_my_native_push_device(text,text,text,text) from public, anon;
grant execute on function public.register_my_native_push_device(text,text,text,text) to authenticated, service_role;

create or replace function public.disable_my_native_push_devices(p_platform text)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare changed integer;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  update public.native_push_devices set enabled=false,updated_at=now() where user_id=auth.uid() and platform=p_platform and enabled;
  get diagnostics changed = row_count; return changed;
end;
$$;
revoke all on function public.disable_my_native_push_devices(text) from public, anon;
grant execute on function public.disable_my_native_push_devices(text) to authenticated, service_role;

create or replace function public.claim_native_push_deliveries(p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare result jsonb;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then raise exception 'service_role_required' using errcode = '42501'; end if;
  insert into public.native_push_deliveries(notification_id, device_id)
  select notification.id, device.id from public.notifications notification join public.native_push_devices device on device.user_id = notification.user_id and device.enabled
  where coalesce(notification.scheduled_for, notification.created_at) <= now()
    and coalesce(notification.scheduled_for, notification.created_at) >= device.enabled_at - interval '1 minute'
    and notification.read_at is null and notification.created_at >= now() - interval '7 days' on conflict do nothing;
  with picked as (
    select delivery.notification_id, delivery.device_id from public.native_push_deliveries delivery
    where delivery.attempts < 5 and (delivery.status='pending' or (delivery.status='processing' and delivery.claimed_at < now()-interval '10 minutes'))
    order by delivery.notification_id for update skip locked limit least(200,greatest(1,coalesce(p_limit,100)))
  ), claimed as (
    update public.native_push_deliveries delivery set status='processing', attempts=delivery.attempts+1, claimed_at=now()
    from picked where delivery.notification_id=picked.notification_id and delivery.device_id=picked.device_id
    returning delivery.notification_id,delivery.device_id,delivery.attempts
  )
  select coalesce(jsonb_agg(jsonb_build_object('notificationId',notification.id,'deviceId',device.id,'attempts',claimed.attempts,
    'platform',device.platform,'token',device.token,'title',notification.title,'body',notification.body,
    'path',case notification.related_entity_type when 'calendar_event' then '/calendar/event/'||notification.related_entity_id::text when 'quest' then '/office' else '/notifications' end)), '[]'::jsonb)
  into result from claimed join public.notifications notification on notification.id=claimed.notification_id join public.native_push_devices device on device.id=claimed.device_id;
  return result;
end;
$$;
revoke all on function public.claim_native_push_deliveries(integer) from public, anon, authenticated;
grant execute on function public.claim_native_push_deliveries(integer) to service_role;

create table if not exists public.operational_events (
  id bigint generated always as identity primary key, source text not null, severity text not null check(severity in ('info','warning','error')),
  code text not null, message text not null default '', metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
alter table public.operational_events enable row level security;
revoke all on public.operational_events from public, anon, authenticated;
grant all on public.operational_events to service_role;
create index if not exists operational_events_created_idx on public.operational_events(created_at desc);

create or replace function public.get_my_entity_page(p_entity text, p_limit integer default 20, p_offset integer default 0, p_query text default '')
returns jsonb language plpgsql security invoker set search_path = public, pg_temp stable as $$
declare owner_id uuid := auth.uid(); result jsonb; page_size integer := least(20,greatest(1,coalesce(p_limit,20))); page_offset integer := greatest(0,coalesce(p_offset,0)); query text := btrim(coalesce(p_query,''));
begin
  if owner_id is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_entity='projects' then select jsonb_build_object('items',coalesce(jsonb_agg(to_jsonb(rows)),'[]'::jsonb),'total',(select count(*) from public.main_quests where user_id=owner_id and (query='' or title ilike '%'||query||'%'))) into result from (select * from public.main_quests where user_id=owner_id and (query='' or title ilike '%'||query||'%') order by created_at desc limit page_size offset page_offset) rows;
  elsif p_entity='quests' then select jsonb_build_object('items',coalesce(jsonb_agg(to_jsonb(rows)),'[]'::jsonb),'total',(select count(*) from public.quests where user_id=owner_id and (query='' or title ilike '%'||query||'%'))) into result from (select * from public.quests where user_id=owner_id and (query='' or title ilike '%'||query||'%') order by created_at desc limit page_size offset page_offset) rows;
  elsif p_entity='calendar_events' then select jsonb_build_object('items',coalesce(jsonb_agg(to_jsonb(rows)),'[]'::jsonb),'total',(select count(*) from public.calendar_events where user_id=owner_id and (query='' or title ilike '%'||query||'%'))) into result from (select * from public.calendar_events where user_id=owner_id and (query='' or title ilike '%'||query||'%') order by event_date desc, created_at desc limit page_size offset page_offset) rows;
  elsif p_entity='memos' then select jsonb_build_object('items',coalesce(jsonb_agg(to_jsonb(rows)),'[]'::jsonb),'total',(select count(*) from public.memos where user_id=owner_id and (query='' or title ilike '%'||query||'%'))) into result from (select * from public.memos where user_id=owner_id and (query='' or title ilike '%'||query||'%') order by created_at desc limit page_size offset page_offset) rows;
  elsif p_entity='relationships' then select jsonb_build_object('items',coalesce(jsonb_agg(to_jsonb(rows)),'[]'::jsonb),'total',(select count(*) from public.relationships where user_id=owner_id and (query='' or name ilike '%'||query||'%'))) into result from (select * from public.relationships where user_id=owner_id and (query='' or name ilike '%'||query||'%') order by created_at desc limit page_size offset page_offset) rows;
  elsif p_entity='diaries' then select jsonb_build_object('items',coalesce(jsonb_agg(to_jsonb(rows)),'[]'::jsonb),'total',(select count(*) from public.diary_entries where user_id=owner_id and (query='' or title ilike '%'||query||'%'))) into result from (select * from public.diary_entries where user_id=owner_id and (query='' or title ilike '%'||query||'%') order by entry_date desc limit page_size offset page_offset) rows;
  else raise exception 'invalid_entity' using errcode='22023'; end if;
  return result;
end;
$$;
revoke all on function public.get_my_entity_page(text,integer,integer,text) from public, anon;
grant execute on function public.get_my_entity_page(text,integer,integer,text) to authenticated, service_role;

insert into public.app_releases(version,title,items,platforms,release_date,published_at,is_published,minimum_versions,force_update)
values('0.6.0','왕국의 기록과 알림을 더 단단하게 다듬었어요',array[
  '다이어리 작성일 표시와 비밀정원 음악 전체 반복 재생을 추가했습니다.',
  '모달과 비망록 상세 화면의 제목 정렬을 통일했습니다.',
  '데이터 관리와 기간·카테고리별 내보내기를 하나로 합쳤습니다.',
  '반복 알림, 시간대, 수정·삭제 및 과거 알림 방지를 강화했습니다.',
  '반복 퀘스트에 요일 선택, 월간 순서·요일, 연간 월·일 설정을 적용했습니다.',
  '서버 페이지네이션, 첨부 검증, 운영 점검과 자동 테스트를 보강했습니다.',
  '웹·iOS·Android 푸시 기기 등록 기반을 추가했습니다.'
],array['web','ios','android'],date '2026-07-22',now(),true,'{"web":"0.6.0","ios":"1.0.0","android":"1.0.0"}'::jsonb,false)
on conflict(version) do update set title=excluded.title,items=excluded.items,platforms=excluded.platforms,release_date=excluded.release_date,published_at=excluded.published_at,is_published=true,updated_at=now();

commit;
