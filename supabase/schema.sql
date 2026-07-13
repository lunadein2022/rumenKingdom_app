-- Rerunnable Supabase schema.
-- Existing tables and rows are preserved; missing objects and newly introduced columns are added.
create extension if not exists "pgcrypto";

do $$ begin
  create type public.quest_status as enum ('planned', 'active', 'completed', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.quest_priority as enum ('low', 'medium', 'high');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.calendar_kind as enum ('royal', 'personal', 'work', 'project', 'anniversary');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '공주',
  timezone text not null default 'Asia/Seoul',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.main_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  goal text not null default '',
  description text not null default '',
  memo text not null default '',
  status public.quest_status not null default 'planned',
  priority public.quest_priority not null default 'medium',
  starts_on date,
  due_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sub_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  main_quest_id uuid references public.main_quests(id) on delete set null,
  title text not null,
  description text not null default '',
  memo text not null default '',
  status public.quest_status not null default 'planned',
  priority public.quest_priority not null default 'medium',
  is_recurring boolean not null default false,
  recurrence_rule text,
  due_on date,
  due_at time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  main_quest_id uuid references public.main_quests(id) on delete set null,
  sub_quest_id uuid references public.sub_quests(id) on delete set null,
  title text not null,
  description text not null default '',
  memo text not null default '',
  quest_date date not null,
  due_at time,
  status public.quest_status not null default 'planned',
  completed_at timestamptz,
  priority public.quest_priority not null default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  event_date date not null,
  end_date date,
  starts_at time not null default '09:00',
  ends_at time,
  all_day boolean not null default false,
  kind public.calendar_kind not null default 'royal',
  important boolean not null default false,
  recurrence_rule text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  title text not null default '',
  body text not null default '',
  mood text,
  ai_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '리타와의 대화',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  relationship_type text not null default '',
  notes text not null default '',
  birthday date,
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#7c68ad',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.entity_tags (
  user_id uuid not null references auth.users(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  entity_type text not null check (entity_type in ('main_quest', 'sub_quest', 'daily_quest', 'calendar_event', 'diary', 'relationship')),
  entity_id uuid not null,
  primary key (tag_id, entity_type, entity_id)
);

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.folders(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null default '',
  scheduled_for timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Upgrade legacy calendar_events rows without discarding their original timestamp columns.
-- The current application reads event_date, end_date, starts_at, ends_at, all_day, kind, important and recurrence_rule.
alter table public.calendar_events
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists title text,
  add column if not exists description text not null default '',
  add column if not exists event_date date,
  add column if not exists end_date date,
  add column if not exists starts_at time,
  add column if not exists ends_at time,
  add column if not exists all_day boolean not null default false,
  add column if not exists kind public.calendar_kind,
  add column if not exists important boolean not null default false,
  add column if not exists recurrence_rule text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
declare
  source_type text;
  missing_dates bigint;
  missing_times bigint;
begin
  -- Some installations already used starts_at but stored a full timestamp in it.
  select data_type into source_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'calendar_events' and column_name = 'starts_at';

  if source_type = 'timestamp with time zone' then
    execute 'update public.calendar_events
      set event_date = coalesce(event_date, (starts_at at time zone ''Asia/Seoul'')::date)';
    execute 'alter table public.calendar_events alter column starts_at type time
      using (starts_at at time zone ''Asia/Seoul'')::time';
  elsif source_type = 'timestamp without time zone' then
    execute 'update public.calendar_events
      set event_date = coalesce(event_date, starts_at::date)';
    execute 'alter table public.calendar_events alter column starts_at type time
      using starts_at::time';
  end if;

  -- The legacy Princess OS schema used start_at/end_at timestamptz columns.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'calendar_events' and column_name = 'start_at'
  ) then
    select data_type into source_type
    from information_schema.columns
    where table_schema = 'public' and table_name = 'calendar_events' and column_name = 'start_at';

    if source_type = 'timestamp with time zone' then
      execute 'update public.calendar_events set
        event_date = coalesce(event_date, (start_at at time zone ''Asia/Seoul'')::date),
        starts_at = coalesce(starts_at, (start_at at time zone ''Asia/Seoul'')::time)';
    else
      execute 'update public.calendar_events set
        event_date = coalesce(event_date, start_at::date),
        starts_at = coalesce(starts_at, start_at::time)';
    end if;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'calendar_events' and column_name = 'event_start'
  ) then
    select data_type into source_type
    from information_schema.columns
    where table_schema = 'public' and table_name = 'calendar_events' and column_name = 'event_start';

    if source_type = 'timestamp with time zone' then
      execute 'update public.calendar_events set
        event_date = coalesce(event_date, (event_start at time zone ''Asia/Seoul'')::date),
        starts_at = coalesce(starts_at, (event_start at time zone ''Asia/Seoul'')::time)';
    else
      execute 'update public.calendar_events set
        event_date = coalesce(event_date, event_start::date),
        starts_at = coalesce(starts_at, event_start::time)';
    end if;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'calendar_events' and column_name = 'start_date'
  ) then
    execute 'update public.calendar_events set event_date = coalesce(event_date, start_date::date)';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'calendar_events' and column_name = 'date'
  ) then
    execute 'update public.calendar_events set event_date = coalesce(event_date, "date"::date)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'calendar_events' and column_name = 'start_time'
  ) then
    execute 'update public.calendar_events set starts_at = coalesce(starts_at, start_time::time)';
  end if;

  select data_type into source_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'calendar_events' and column_name = 'ends_at';

  if source_type = 'timestamp with time zone' then
    execute 'alter table public.calendar_events alter column ends_at type time
      using (ends_at at time zone ''Asia/Seoul'')::time';
  elsif source_type = 'timestamp without time zone' then
    execute 'alter table public.calendar_events alter column ends_at type time
      using ends_at::time';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'calendar_events' and column_name = 'end_at'
  ) then
    select data_type into source_type
    from information_schema.columns
    where table_schema = 'public' and table_name = 'calendar_events' and column_name = 'end_at';

    if source_type = 'timestamp with time zone' then
      execute 'update public.calendar_events
        set ends_at = coalesce(ends_at, (end_at at time zone ''Asia/Seoul'')::time)';
    else
      execute 'update public.calendar_events
        set ends_at = coalesce(ends_at, end_at::time)';
    end if;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'calendar_events' and column_name = 'category'
  ) then
    execute 'update public.calendar_events set kind = coalesce(kind,
      case category
        when ''work'' then ''work''::public.calendar_kind
        when ''personal'' then ''personal''::public.calendar_kind
        when ''rest'' then ''personal''::public.calendar_kind
        when ''quest'' then ''project''::public.calendar_kind
        when ''routine'' then ''project''::public.calendar_kind
        when ''event'' then ''anniversary''::public.calendar_kind
        else ''royal''::public.calendar_kind
      end)';
  end if;

  update public.calendar_events set kind = 'royal' where kind is null;
  update public.calendar_events set end_date = event_date where end_date is null and event_date is not null;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'calendar_events' and column_name = 'priority'
  ) then
    execute 'update public.calendar_events
      set important = true where priority::text = ''high'' and important = false';
  end if;

  select count(*) into missing_dates from public.calendar_events where event_date is null;
  select count(*) into missing_times from public.calendar_events where starts_at is null;

  if missing_dates > 0 or missing_times > 0 then
    raise exception using message = format(
      'calendar_events migration stopped: %s rows have no date and %s rows have no start time. Original columns were preserved; inspect those rows before retrying.',
      missing_dates,
      missing_times
    );
  end if;
end $$;

alter table public.calendar_events
  alter column user_id set default auth.uid(),
  alter column event_date set not null,
  alter column starts_at set default '09:00',
  alter column starts_at set not null,
  alter column kind set default 'royal',
  alter column kind set not null;

-- Every browser insert is owned by the authenticated account even when user_id is omitted.
alter table public.main_quests alter column user_id set default auth.uid();
alter table public.sub_quests alter column user_id set default auth.uid();
alter table public.daily_quests alter column user_id set default auth.uid();
alter table public.diary_entries alter column user_id set default auth.uid();
alter table public.ai_conversations alter column user_id set default auth.uid();
alter table public.relationships alter column user_id set default auth.uid();
alter table public.tags alter column user_id set default auth.uid();
alter table public.entity_tags alter column user_id set default auth.uid();
alter table public.folders alter column user_id set default auth.uid();
alter table public.attachments alter column user_id set default auth.uid();
alter table public.notifications alter column user_id set default auth.uid();

-- Existing projects receive newly introduced fields without replacing any rows.
alter table public.main_quests
  add column if not exists goal text not null default '',
  add column if not exists memo text not null default '';

alter table public.sub_quests
  add column if not exists memo text not null default '',
  add column if not exists due_on date,
  add column if not exists due_at time;

alter table public.daily_quests
  add column if not exists memo text not null default '',
  add column if not exists due_at time,
  add column if not exists status public.quest_status not null default 'planned';

-- Main quests are optional link targets. Removing one keeps its quests as independent records.
alter table public.sub_quests drop constraint if exists sub_quests_main_quest_id_fkey;
alter table public.sub_quests add constraint sub_quests_main_quest_id_fkey
  foreign key (main_quest_id) references public.main_quests(id) on delete set null;

alter table public.daily_quests drop constraint if exists daily_quests_main_quest_id_fkey;
alter table public.daily_quests add constraint daily_quests_main_quest_id_fkey
  foreign key (main_quest_id) references public.main_quests(id) on delete set null;

create index if not exists main_quests_user_status_idx on public.main_quests(user_id, status);
create index if not exists daily_quests_user_date_idx on public.daily_quests(user_id, quest_date);
create index if not exists calendar_events_user_date_idx on public.calendar_events(user_id, event_date);
create index if not exists diary_entries_user_date_idx on public.diary_entries(user_id, entry_date desc);
create index if not exists relationships_user_name_idx on public.relationships(user_id, name);
create index if not exists attachments_entity_idx on public.attachments(user_id, entity_type, entity_id);
create index if not exists notifications_user_schedule_idx on public.notifications(user_id, scheduled_for);

alter table public.profiles enable row level security;
alter table public.main_quests enable row level security;
alter table public.sub_quests enable row level security;
alter table public.daily_quests enable row level security;
alter table public.calendar_events enable row level security;
alter table public.diary_entries enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.relationships enable row level security;
alter table public.tags enable row level security;
alter table public.entity_tags enable row level security;
alter table public.folders enable row level security;
alter table public.attachments enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "profiles_own_rows" on public.profiles;
drop policy if exists "main_quests_own_rows" on public.main_quests;
drop policy if exists "sub_quests_own_rows" on public.sub_quests;
drop policy if exists "daily_quests_own_rows" on public.daily_quests;
drop policy if exists "calendar_events_own_rows" on public.calendar_events;
drop policy if exists "diary_entries_own_rows" on public.diary_entries;
drop policy if exists "ai_conversations_own_rows" on public.ai_conversations;
drop policy if exists "relationships_own_rows" on public.relationships;
drop policy if exists "tags_own_rows" on public.tags;
drop policy if exists "entity_tags_own_rows" on public.entity_tags;
drop policy if exists "folders_own_rows" on public.folders;
drop policy if exists "attachments_own_rows" on public.attachments;
drop policy if exists "notifications_own_rows" on public.notifications;

create policy "profiles_own_rows" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "main_quests_own_rows" on public.main_quests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sub_quests_own_rows" on public.sub_quests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "daily_quests_own_rows" on public.daily_quests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "calendar_events_own_rows" on public.calendar_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "diary_entries_own_rows" on public.diary_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_conversations_own_rows" on public.ai_conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "relationships_own_rows" on public.relationships for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tags_own_rows" on public.tags for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "entity_tags_own_rows" on public.entity_tags for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "folders_own_rows" on public.folders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "attachments_own_rows" on public.attachments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications_own_rows" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
drop trigger if exists main_quests_touch_updated_at on public.main_quests;
drop trigger if exists sub_quests_touch_updated_at on public.sub_quests;
drop trigger if exists daily_quests_touch_updated_at on public.daily_quests;
drop trigger if exists calendar_events_touch_updated_at on public.calendar_events;
drop trigger if exists diary_entries_touch_updated_at on public.diary_entries;
drop trigger if exists ai_conversations_touch_updated_at on public.ai_conversations;
drop trigger if exists relationships_touch_updated_at on public.relationships;
drop trigger if exists folders_touch_updated_at on public.folders;

create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger main_quests_touch_updated_at before update on public.main_quests for each row execute function public.touch_updated_at();
create trigger sub_quests_touch_updated_at before update on public.sub_quests for each row execute function public.touch_updated_at();
create trigger daily_quests_touch_updated_at before update on public.daily_quests for each row execute function public.touch_updated_at();
create trigger calendar_events_touch_updated_at before update on public.calendar_events for each row execute function public.touch_updated_at();
create trigger diary_entries_touch_updated_at before update on public.diary_entries for each row execute function public.touch_updated_at();
create trigger ai_conversations_touch_updated_at before update on public.ai_conversations for each row execute function public.touch_updated_at();
create trigger relationships_touch_updated_at before update on public.relationships for each row execute function public.touch_updated_at();
create trigger folders_touch_updated_at before update on public.folders for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', '공주'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Private originals uploaded through Rita. The first path segment is always the user id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rita-attachments', 'rita-attachments', false, 4194304, array[
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'text/markdown', 'text/csv',
  'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/ogg'
])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "rita_attachments_select_own" on storage.objects;
drop policy if exists "rita_attachments_insert_own" on storage.objects;
drop policy if exists "rita_attachments_update_own" on storage.objects;
drop policy if exists "rita_attachments_delete_own" on storage.objects;

create policy "rita_attachments_select_own" on storage.objects for select to authenticated
using (bucket_id = 'rita-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "rita_attachments_insert_own" on storage.objects for insert to authenticated
with check (bucket_id = 'rita-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "rita_attachments_update_own" on storage.objects for update to authenticated
using (bucket_id = 'rita-attachments' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'rita-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "rita_attachments_delete_own" on storage.objects for delete to authenticated
using (bucket_id = 'rita-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
