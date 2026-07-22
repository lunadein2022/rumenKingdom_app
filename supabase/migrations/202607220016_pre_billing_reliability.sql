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
