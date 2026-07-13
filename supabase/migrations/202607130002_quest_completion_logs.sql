-- Preserve recurring quest history per service date instead of clearing quests.completed_at.
-- Safe to run repeatedly. Existing recurring completions are migrated before the template row is reset.
begin;

create table if not exists public.quest_completion_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  quest_id uuid not null,
  occurrence_date date not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, quest_id, occurrence_date)
);

do $$ begin
  alter table public.quest_completion_logs
    add constraint quest_completion_logs_quest_owner_fkey
    foreign key (quest_id, user_id)
    references public.quests(id, user_id)
    on delete cascade;
exception when duplicate_object then null;
end $$;

create index if not exists quest_completion_logs_user_date_idx
  on public.quest_completion_logs(user_id, occurrence_date);

create index if not exists quest_completion_logs_quest_idx
  on public.quest_completion_logs(quest_id);

-- The previous implementation stored only the latest completion on the reusable quest row.
-- Convert it to a dated log using the kingdom service-day boundary (06:00 Asia/Seoul).
insert into public.quest_completion_logs (user_id, quest_id, occurrence_date, completed_at)
select
  user_id,
  id,
  ((completed_at at time zone 'Asia/Seoul') - interval '6 hours')::date,
  completed_at
from public.quests
where recurrence_rule is not null
  and btrim(recurrence_rule) <> ''
  and completed_at is not null
on conflict (user_id, quest_id, occurrence_date)
do update set completed_at = excluded.completed_at;

-- Recurring quest rows are templates. Completion now belongs exclusively to the dated log.
update public.quests
set status = case when status::text = 'completed' then 'active'::public.quest_status else status end,
    completed_at = null
where recurrence_rule is not null
  and btrim(recurrence_rule) <> ''
  and (status::text = 'completed' or completed_at is not null);

alter table public.quest_completion_logs enable row level security;

drop policy if exists "quest_completion_logs_own_rows" on public.quest_completion_logs;
create policy "quest_completion_logs_own_rows"
  on public.quest_completion_logs
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;
