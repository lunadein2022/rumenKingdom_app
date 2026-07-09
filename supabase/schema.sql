-- Run this in Supabase Dashboard -> SQL Editor

create table if not exists quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  title text not null,
  done boolean default false,
  created_at timestamptz default now()
);

alter table quests enable row level security;

drop policy if exists "Users can view their own quests" on quests;
create policy "Users can view their own quests"
  on quests for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own quests" on quests;
create policy "Users can insert their own quests"
  on quests for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own quests" on quests;
create policy "Users can update their own quests"
  on quests for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own quests" on quests;
create policy "Users can delete their own quests"
  on quests for delete
  using (auth.uid() = user_id);

-- ---------- Quest gamification fields ----------
-- status: pending -> inProgress -> completed
-- expReward: how much EXP this quest is worth when completed
-- dueDate: if set, counts toward "today's progress" when it matches today
-- completedAt / rewardClaimed: track reward-claim state separately from completion

alter table quests add column if not exists status text not null default 'pending'
  check (status in ('pending','inProgress','completed'));
alter table quests add column if not exists exp_reward integer not null default 10;
alter table quests add column if not exists due_date date;
alter table quests add column if not exists completed_at timestamptz;
alter table quests add column if not exists reward_claimed boolean not null default false;

-- migrate old boolean `done` column into the new status field, then drop it
update quests set status = 'completed', completed_at = coalesce(completed_at, created_at)
  where done = true and status = 'pending';
alter table quests drop column if exists done;

-- ---------- Daily completions (for streak calculation) ----------
-- One row per user per calendar date; quest_count = how many quests were
-- completed that day. Streak = consecutive days ending today with quest_count >= 1.
create table if not exists daily_completions (
  user_id uuid references auth.users(id) not null,
  completion_date date not null,
  quest_count integer not null default 0,
  primary key (user_id, completion_date)
);

alter table daily_completions enable row level security;

drop policy if exists "Users can view their own daily completions" on daily_completions;
create policy "Users can view their own daily completions"
  on daily_completions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own daily completions" on daily_completions;
create policy "Users can insert their own daily completions"
  on daily_completions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own daily completions" on daily_completions;
create policy "Users can update their own daily completions"
  on daily_completions for update
  using (auth.uid() = user_id);

-- ---------- Calendar events ----------
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  title text not null,
  event_date date not null,
  created_at timestamptz default now()
);

alter table events enable row level security;

drop policy if exists "Users can view their own events" on events;
create policy "Users can view their own events"
  on events for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own events" on events;
create policy "Users can insert their own events"
  on events for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own events" on events;
create policy "Users can update their own events"
  on events for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own events" on events;
create policy "Users can delete their own events"
  on events for delete
  using (auth.uid() = user_id);

