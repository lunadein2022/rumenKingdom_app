-- Princess OS 스키마 보강 (v2)
-- schema.sql 을 먼저 실행한 뒤, 이 파일을 Supabase Dashboard → SQL Editor에서 실행하세요.
-- 여러 번 실행해도 안전하도록 if not exists / add column if not exists 로 작성했습니다.

-- ---------------------------------------------------------------------------
-- 1. 메인 퀘스트(=프로젝트) 테이블. 앱의 MainQuest 모델은 챕터/업데이트 로그 등
--    중첩 구조라, 관계 테이블 대신 JSONB 컬럼으로 통째로 저장합니다(단일 사용자
--    개인 데이터 규모라 이 방식이 가장 단순하고 안전합니다).
-- ---------------------------------------------------------------------------
create table if not exists public.main_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'onHold', 'completed')),
  progress integer not null default 0,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  start_date date,
  due_date date,
  chapters jsonb not null default '[]'::jsonb,
  updates jsonb not null default '[]'::jsonb,
  sub_quest_ids jsonb not null default '[]'::jsonb,
  daily_quest_ids jsonb not null default '[]'::jsonb,
  linked_calendar_event_ids jsonb not null default '[]'::jsonb,
  related_contact_ids jsonb not null default '[]'::jsonb,
  attached_files jsonb not null default '[]'::jsonb,
  reward_exp integer not null default 0,
  reward_gold integer not null default 0,
  exp_total integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.main_quests enable row level security;
drop policy if exists "Users manage own main quests" on public.main_quests;
create policy "Users manage own main quests" on public.main_quests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. princess_diary 보강 — 앱 DiaryEntry의 기분 이모지/라벨과 연결 데이터.
-- ---------------------------------------------------------------------------
alter table public.princess_diary add column if not exists mood_emoji text not null default '🙂';
alter table public.princess_diary add column if not exists mood_label text not null default '평온';
alter table public.princess_diary add column if not exists linked_event_titles jsonb not null default '[]'::jsonb;
alter table public.princess_diary add column if not exists linked_quest_titles jsonb not null default '[]'::jsonb;
alter table public.princess_diary add column if not exists linked_main_quest_updates jsonb not null default '[]'::jsonb;
-- title 은 원래 not null 이므로, 내용 기반 다이어리에선 빈 값을 허용합니다.
alter table public.princess_diary alter column title set default '';

-- ---------------------------------------------------------------------------
-- 3. contacts 보강 — 앱 RelationshipContact의 친밀도/관련 프로젝트/AI 요약.
-- ---------------------------------------------------------------------------
alter table public.contacts add column if not exists affinity integer not null default 3;
alter table public.contacts add column if not exists related_main_quest_ids jsonb not null default '[]'::jsonb;
alter table public.contacts add column if not exists ai_summary text;
alter table public.contacts add column if not exists last_meeting_at timestamptz;
