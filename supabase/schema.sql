-- Princess OS unified Supabase schema
-- Run in Supabase Dashboard -> SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default 'Princess',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.princess_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  display_name text not null default 'Princess',
  active_title text default '루멘의 공주',
  avatar_url text,
  current_room text not null default 'lobby',
  charm int not null default 0,
  wisdom int not null default 0,
  courage int not null default 0,
  diligence int not null default 0,
  serin_affinity int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'pending' check (status in ('pending', 'inProgress', 'completed')),
  category text not null default 'routine',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  exp_reward integer not null default 10,
  gold_reward integer not null default 0,
  due_date date,
  completed_at timestamptz,
  reward_claimed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  event_date date not null,
  room_key text not null default 'office',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  level integer not null default 1,
  current_exp integer not null default 0,
  required_exp integer not null default 100,
  total_completed_quests integer not null default 0,
  streak_days integer not null default 0,
  last_active_date date,
  pending_rewards_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  completion_date date not null,
  quest_count integer not null default 0,
  primary key (user_id, completion_date)
);

create table if not exists public.castle_rooms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  room_key text not null,
  room_name text not null,
  level integer not null default 1,
  is_unlocked boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, room_key)
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  achievement_key text not null unique,
  title text not null,
  description text not null,
  exp_reward integer not null default 0,
  gold_reward integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, achievement_id)
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null,
  item_name text not null,
  slot text not null,
  is_equipped boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, item_key)
);

create table if not exists public.user_titles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title_key text not null,
  title_name text not null,
  is_unlocked boolean not null default false,
  is_equipped boolean not null default false,
  unlocked_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, title_key)
);

create table if not exists public.serin_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.serin_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_type text not null,
  content text not null,
  importance integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.princess_profiles enable row level security;
alter table public.quests enable row level security;
alter table public.calendar_events enable row level security;
alter table public.user_progress enable row level security;
alter table public.daily_completions enable row level security;
alter table public.castle_rooms enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.inventory_items enable row level security;
alter table public.user_titles enable row level security;
alter table public.serin_conversations enable row level security;
alter table public.serin_memory enable row level security;

create policy "Users manage own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users manage own princess profile" on public.princess_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own quests" on public.quests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own calendar events" on public.calendar_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own progress" on public.user_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own daily completions" on public.daily_completions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own rooms" on public.castle_rooms
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Anyone can view achievement catalog" on public.achievements
  for select using (true);

create policy "Users manage own achievements" on public.user_achievements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own inventory" on public.inventory_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own titles" on public.user_titles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own Serin conversations" on public.serin_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own Serin memory" on public.serin_memory
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
