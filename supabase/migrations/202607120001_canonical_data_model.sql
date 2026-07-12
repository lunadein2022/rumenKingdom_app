-- Canonical Princess OS data model.
-- Run after supabase/schema.sql. This migration is rerunnable and preserves legacy rows.
create extension if not exists "pgcrypto";

-- Self-contained type + trigger dependencies. Older projects may predate these in schema.sql.
do $$ begin
  create type public.quest_kind as enum ('daily', 'sub');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.quest_status as enum ('planned', 'active', 'completed', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.quest_priority as enum ('low', 'medium', 'high');
exception when duplicate_object then null;
end $$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.profiles
  add column if not exists intro text not null default '',
  add column if not exists service_day_starts_at time not null default '06:00';

alter table public.main_quests
  add column if not exists favorite boolean not null default false,
  add column if not exists manual_progress smallint,
  add column if not exists completed_at timestamptz;

do $$ begin
  alter table public.main_quests
    add constraint main_quests_manual_progress_check
    check (manual_progress is null or manual_progress between 0 and 100);
exception when duplicate_object then null;
end $$;

create unique index if not exists main_quests_id_user_uidx
  on public.main_quests(id, user_id);

create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  main_quest_id uuid,
  parent_quest_id uuid,
  kind public.quest_kind not null,
  title text not null,
  description text not null default '',
  memo text not null default '',
  status public.quest_status not null default 'planned',
  priority public.quest_priority not null default 'medium',
  scheduled_on date,
  due_on date,
  due_at time,
  recurrence_rule text,
  favorite boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check (parent_quest_id is null or parent_quest_id <> id),
  check ((status = 'completed' and completed_at is not null) or status <> 'completed')
);

do $$ begin
  alter table public.quests add constraint quests_main_quest_owner_fkey
    foreign key (main_quest_id, user_id)
    references public.main_quests(id, user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.quests add constraint quests_parent_owner_fkey
    foreign key (parent_quest_id, user_id)
    references public.quests(id, user_id);
exception when duplicate_object then null;
end $$;

-- Preserve both legacy quest sources. They remain available until repository cutover is verified.
insert into public.quests (
  id, user_id, main_quest_id, kind, title, description, memo, status, priority,
  due_on, due_at, recurrence_rule, completed_at, created_at, updated_at
)
select
  sub.id, sub.user_id,
  -- Drop cross-account project links: legacy single-column FK allowed them, the composite FK does not.
  case when mq.id is not null then sub.main_quest_id else null end,
  'sub'::public.quest_kind, sub.title,
  '',                                 -- legacy sub_quests has no description column
  coalesce(sub.memo, ''),
  sub.status::public.quest_status,    -- legacy status/priority are text, not the canonical enums
  'medium'::public.quest_priority,    -- legacy sub_quests has no priority column
  sub.due_on, sub.due_at,
  null,                               -- legacy recurrence is jsonb and stays in the preserved source table
  case when sub.status = 'completed' then coalesce(sub.updated_at, now()) else null end,
  sub.created_at, sub.updated_at
from public.sub_quests sub
left join public.main_quests mq on mq.id = sub.main_quest_id and mq.user_id = sub.user_id
on conflict (id) do nothing;

insert into public.quests (
  id, user_id, main_quest_id, parent_quest_id, kind, title, description, memo,
  status, priority, scheduled_on, due_on, due_at, completed_at, created_at, updated_at
)
select
  daily.id, daily.user_id,
  -- Drop cross-account project links: legacy single-column FK allowed them, the composite FK does not.
  case when mq.id is not null then daily.main_quest_id else null end,
  case when parent.id is not null and parent.user_id = daily.user_id then daily.sub_quest_id else null end,
  'daily'::public.quest_kind, daily.title,
  '',                                 -- legacy daily_quests has no description column
  coalesce(daily.memo, ''),
  daily.status::public.quest_status,    -- legacy status/priority are text, not the canonical enums
  daily.priority::public.quest_priority,
  daily.quest_date, daily.quest_date, daily.due_at,
  case when daily.status = 'completed' then coalesce(daily.updated_at, now()) else null end,  -- legacy daily_quests has no completed_at
  daily.created_at, daily.updated_at
from public.daily_quests daily
left join public.main_quests mq on mq.id = daily.main_quest_id and mq.user_id = daily.user_id
left join public.quests parent on parent.id = daily.sub_quest_id
on conflict (id) do nothing;

create index if not exists quests_user_status_idx on public.quests(user_id, status);
create index if not exists quests_user_due_idx on public.quests(user_id, due_on, due_at);
create index if not exists quests_user_main_idx on public.quests(user_id, main_quest_id);

-- Deleting a project or parent quest keeps its execution records as independent records.
create or replace function public.detach_main_quest_links()
returns trigger language plpgsql security invoker as $$
begin
  update public.quests set main_quest_id = null where user_id = old.user_id and main_quest_id = old.id;
  update public.memos set main_quest_id = null where user_id = old.user_id and main_quest_id = old.id;
  return old;
end;
$$;

drop trigger if exists main_quests_detach_quest_links on public.main_quests;
create trigger main_quests_detach_quest_links
before delete on public.main_quests for each row execute function public.detach_main_quest_links();

create or replace function public.detach_child_quest_links()
returns trigger language plpgsql security invoker as $$
begin
  update public.quests set parent_quest_id = null where user_id = old.user_id and parent_quest_id = old.id;
  return old;
end;
$$;

drop trigger if exists quests_detach_child_links on public.quests;
create trigger quests_detach_child_links
before delete on public.quests for each row execute function public.detach_child_quest_links();

create table if not exists public.memos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  main_quest_id uuid,
  title text not null,
  content text not null default '',
  transcript text,
  status text not null default 'normal' check (status in ('normal', 'review', 'completed', 'archived')),
  source text not null default 'manual' check (source in ('manual', 'rita', 'document', 'audio')),
  important boolean not null default false,
  favorite boolean not null default false,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

-- Inline tag list (entity_tags table is a later phase). Keep it on existing memos tables too.
alter table public.memos add column if not exists tags jsonb not null default '[]'::jsonb;

do $$ begin
  alter table public.memos add constraint memos_main_quest_owner_fkey
    foreign key (main_quest_id, user_id)
    references public.main_quests(id, user_id);
exception when duplicate_object then null;
end $$;

alter table public.diary_entries
  add column if not exists favorite boolean not null default false,
  add column if not exists title text not null default '',
  add column if not exists tags jsonb not null default '[]'::jsonb;

create unique index if not exists diary_entries_id_user_uidx
  on public.diary_entries(id, user_id);

create table if not exists public.diary_quest_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  diary_id uuid not null,
  quest_id uuid,
  source_quest_id uuid not null,
  snapshot_title text not null,
  snapshot_note text not null default '',
  imported_at timestamptz not null default now(),
  unique (user_id, diary_id, source_quest_id),
  foreign key (diary_id, user_id) references public.diary_entries(id, user_id) on delete cascade,
  foreign key (quest_id, user_id) references public.quests(id, user_id)
);

create or replace function public.preserve_diary_quest_snapshots()
returns trigger language plpgsql security invoker as $$
begin
  update public.diary_quest_links set quest_id = null
  where user_id = old.user_id and quest_id = old.id;
  return old;
end;
$$;

drop trigger if exists quests_preserve_diary_snapshots on public.quests;
create trigger quests_preserve_diary_snapshots
before delete on public.quests for each row execute function public.preserve_diary_quest_snapshots();

create table if not exists public.calendar_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#7c68ad',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name)
);

alter table public.calendar_events add column if not exists category_id uuid;
create unique index if not exists calendar_events_id_user_uidx
  on public.calendar_events(id, user_id);

do $$ begin
  alter table public.calendar_events add constraint calendar_events_category_owner_fkey
    foreign key (category_id, user_id)
    references public.calendar_categories(id, user_id);
exception when duplicate_object then null;
end $$;

create or replace function public.detach_calendar_category()
returns trigger language plpgsql security invoker as $$
begin
  update public.calendar_events set category_id = null
  where user_id = old.user_id and category_id = old.id;
  return old;
end;
$$;

drop trigger if exists calendar_categories_detach_events on public.calendar_categories;
create trigger calendar_categories_detach_events
before delete on public.calendar_categories for each row execute function public.detach_calendar_category();

create table if not exists public.recurrence_exceptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  calendar_event_id uuid not null,
  occurrence_date date not null,
  replacement jsonb,
  cancelled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, calendar_event_id, occurrence_date),
  foreign key (calendar_event_id, user_id) references public.calendar_events(id, user_id) on delete cascade
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('quest', 'calendar_event')),
  entity_id uuid not null,
  remind_at timestamptz not null,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications
  add column if not exists kind text not null default 'general',
  add column if not exists related_entity_type text,
  add column if not exists related_entity_id uuid;

create table if not exists public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_backgrounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  room_key text not null check (room_key in ('lobby', 'office', 'calendar', 'library', 'diary', 'garden', 'rita', 'throne')),
  storage_path text not null,
  position text not null default 'center',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, room_key)
);

-- Expand the relationship record without replacing existing rows.
alter table public.relationships
  add column if not exists organization text not null default '',
  add column if not exists position text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists email text not null default '',
  add column if not exists social text not null default '',
  add column if not exists address text not null default '',
  add column if not exists first_met_at date,
  add column if not exists last_contacted_at date,
  add column if not exists business_card_ocr_text text,
  add column if not exists favorite boolean not null default false,
  add column if not exists source text not null default 'manual';

-- New tables use the same authoritative ownership boundary.
alter table public.quests enable row level security;
alter table public.memos enable row level security;
alter table public.diary_quest_links enable row level security;
alter table public.calendar_categories enable row level security;
alter table public.recurrence_exceptions enable row level security;
alter table public.reminders enable row level security;
alter table public.user_settings enable row level security;
alter table public.room_backgrounds enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'quests', 'memos', 'diary_quest_links', 'calendar_categories',
    'recurrence_exceptions', 'reminders', 'user_settings', 'room_backgrounds'
  ] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_own_rows', table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      table_name || '_own_rows', table_name
    );
  end loop;
end $$;

drop trigger if exists quests_touch_updated_at on public.quests;
drop trigger if exists memos_touch_updated_at on public.memos;
drop trigger if exists calendar_categories_touch_updated_at on public.calendar_categories;
drop trigger if exists user_settings_touch_updated_at on public.user_settings;
drop trigger if exists room_backgrounds_touch_updated_at on public.room_backgrounds;
create trigger quests_touch_updated_at before update on public.quests for each row execute function public.touch_updated_at();
create trigger memos_touch_updated_at before update on public.memos for each row execute function public.touch_updated_at();
create trigger calendar_categories_touch_updated_at before update on public.calendar_categories for each row execute function public.touch_updated_at();
create trigger user_settings_touch_updated_at before update on public.user_settings for each row execute function public.touch_updated_at();
create trigger room_backgrounds_touch_updated_at before update on public.room_backgrounds for each row execute function public.touch_updated_at();

-- User-selectable room backgrounds. Rita originals stay in the separate rita-attachments bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('room-backgrounds', 'room-backgrounds', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "room_backgrounds_select_own" on storage.objects;
drop policy if exists "room_backgrounds_insert_own" on storage.objects;
drop policy if exists "room_backgrounds_update_own" on storage.objects;
drop policy if exists "room_backgrounds_delete_own" on storage.objects;
create policy "room_backgrounds_select_own" on storage.objects for select to authenticated
using (bucket_id = 'room-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "room_backgrounds_insert_own" on storage.objects for insert to authenticated
with check (bucket_id = 'room-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "room_backgrounds_update_own" on storage.objects for update to authenticated
using (bucket_id = 'room-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'room-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "room_backgrounds_delete_own" on storage.objects for delete to authenticated
using (bucket_id = 'room-backgrounds' and (storage.foldername(name))[1] = auth.uid()::text);
