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
  current_level integer not null default 1,
  current_exp integer not null default 0,
  current_room text not null default 'lobby',
  current_mood text not null default 'calm',
  castle_level integer not null default 1,
  charm int not null default 0,
  wisdom int not null default 0,
  courage int not null default 0,
  diligence int not null default 0,
  serin_affinity int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.princess_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  charm integer not null default 0,
  wisdom integer not null default 0,
  courage integer not null default 0,
  diligence integer not null default 0,
  kindness integer not null default 0,
  creativity integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.princess_equipment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slot text not null,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  equipped_at timestamptz not null default now(),
  unique(user_id, slot)
);

create table if not exists public.princess_diary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  title text not null,
  content text not null,
  ai_summary text,
  mood text not null default 'calm',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'daily' check (type in ('main', 'side', 'daily', 'routine', 'story')),
  title text not null,
  description text not null default '',
  status text not null default 'pending' check (status in ('pending', 'inProgress', 'completed')),
  category text not null default 'routine',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  chapter text,
  parent_id uuid references public.quests(id) on delete set null,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  exp_reward integer not null default 10,
  gold_reward integer not null default 0,
  reward_item text,
  due_date date,
  completed_at timestamptz,
  reward_claimed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quest_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id uuid not null references public.quests(id) on delete cascade,
  completed_at timestamptz not null default now(),
  reward_exp integer not null default 0,
  reward_item text,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  start_at timestamptz not null,
  end_at timestamptz,
  location text,
  category text not null default 'personal' check (category in ('work', 'personal', 'quest', 'routine', 'meeting', 'serin', 'rest', 'event')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  is_all_day boolean not null default false,
  reminder_minutes integer,
  reminder_sent_at timestamptz,
  linked_quest_id uuid references public.quests(id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_by text not null default 'user' check (created_by in ('user', 'serin', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  remind_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'cancelled')),
  sent_at timestamptz,
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
  unlock_level integer not null default 1,
  room_level integer not null default 1,
  is_unlocked boolean not null default true,
  is_discovered boolean not null default true,
  visited_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, room_key)
);

create table if not exists public.castle_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  castle_level integer not null default 1,
  castle_exp integer not null default 0,
  castle_theme text not null default 'royal_blue',
  season text not null default 'summer',
  time_of_day text not null default 'morning',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_decorations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_key text not null,
  decoration_key text not null,
  is_unlocked boolean not null default false,
  is_equipped boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, room_key, decoration_key)
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
  title text not null default '세린과 대화',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.serin_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.serin_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'serin', 'system')),
  message_type text not null default 'text' check (message_type in ('text', 'confirmation', 'quest_preview', 'calendar_preview', 'contact_preview', 'diary_preview', 'memory_saved', 'system_notice', 'error')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.serin_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_type text not null check (memory_type in ('preference', 'person', 'routine', 'goal', 'constraint', 'emotion', 'work', 'personal', 'system')),
  content text not null,
  importance text not null default 'medium' check (importance in ('low', 'medium', 'high', 'critical')),
  source text not null default 'chat',
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  organization text,
  position text,
  memo text,
  source text not null default 'manual' check (source in ('manual', 'serin', 'ocr', 'import')),
  image_url text,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.relationship_book (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  relationship_label text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.diary_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  source text not null default 'serin' check (source in ('serin', 'system')),
  status text not null default 'draft' check (status in ('draft', 'saved', 'discarded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.princess_profiles enable row level security;
alter table public.princess_stats enable row level security;
alter table public.princess_equipment enable row level security;
alter table public.princess_diary enable row level security;
alter table public.quests enable row level security;
alter table public.quest_history enable row level security;
alter table public.calendar_events enable row level security;
alter table public.calendar_reminders enable row level security;
alter table public.user_progress enable row level security;
alter table public.daily_completions enable row level security;
alter table public.castle_rooms enable row level security;
alter table public.castle_state enable row level security;
alter table public.room_decorations enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.inventory_items enable row level security;
alter table public.user_titles enable row level security;
alter table public.serin_conversations enable row level security;
alter table public.serin_messages enable row level security;
alter table public.serin_memory enable row level security;
alter table public.contacts enable row level security;
alter table public.relationship_book enable row level security;
alter table public.diary_drafts enable row level security;

create policy "Users manage own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users manage own princess profile" on public.princess_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own princess stats" on public.princess_stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own princess equipment" on public.princess_equipment
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own princess diary" on public.princess_diary
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own quests" on public.quests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own quest history" on public.quest_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own calendar events" on public.calendar_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own calendar reminders" on public.calendar_reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own progress" on public.user_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own daily completions" on public.daily_completions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own rooms" on public.castle_rooms
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own castle state" on public.castle_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own room decorations" on public.room_decorations
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

create policy "Users manage own Serin messages" on public.serin_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own Serin memory" on public.serin_memory
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own contacts" on public.contacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own relationship book" on public.relationship_book
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own diary drafts" on public.diary_drafts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
