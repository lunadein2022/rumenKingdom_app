-- Princess OS — Castle Growth System v1
-- Supabase schema proposal

create table if not exists public.castle_rooms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_key text not null,
  room_name text not null,
  unlock_level int not null default 1,
  current_level int not null default 1,
  is_unlocked boolean not null default false,
  is_discovered boolean not null default false,
  is_upgraded boolean not null default false,
  updated_at timestamptz not null default now(),
  unique(user_id, room_key)
);

alter table public.castle_rooms enable row level security;

create policy "Users can view own castle rooms"
on public.castle_rooms for select
using (auth.uid() = user_id);

create policy "Users can insert own castle rooms"
on public.castle_rooms for insert
with check (auth.uid() = user_id);

create policy "Users can update own castle rooms"
on public.castle_rooms for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
