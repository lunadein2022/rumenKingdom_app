-- Shared release notes and minimum-version policy for web, iOS and Android.
begin;

create table if not exists public.app_releases (
  version text primary key,
  title text not null,
  items text[] not null default '{}',
  platforms text[] not null default array['web', 'ios', 'android'],
  release_date date not null,
  published_at timestamptz not null default now(),
  is_published boolean not null default false,
  minimum_versions jsonb not null default '{}'::jsonb,
  force_update boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_releases_version_length check (char_length(version) between 1 and 40),
  constraint app_releases_items_limit check (cardinality(items) <= 30),
  constraint app_releases_platforms_allowed check (platforms <@ array['web', 'ios', 'android']::text[])
);

create index if not exists app_releases_published_idx
  on public.app_releases (published_at desc)
  where is_published;

alter table public.app_releases enable row level security;
drop policy if exists app_releases_public_read on public.app_releases;
create policy app_releases_public_read
  on public.app_releases for select
  to anon, authenticated
  using (is_published and published_at <= now());

revoke all on table public.app_releases from public, anon, authenticated;
grant select on table public.app_releases to anon, authenticated;
grant select, insert, update, delete on table public.app_releases to service_role;

insert into public.app_releases (
  version, title, items, platforms, release_date, published_at, is_published,
  minimum_versions, force_update
) values (
  '0.5.0',
  '왕국 계정과 리타가 더 든든해졌어요',
  array[
    '리타 AI 포인트 사용량과 이용 기록을 계정별로 확인할 수 있어요.',
    '관리자가 보낸 포인트와 이용권 선물이 알림과 지급 이력에 남아요.',
    '새 알림은 확인할 때까지 종 아이콘의 숫자 배지로 표시돼요.',
    '웹·iOS·Android가 함께 읽을 수 있는 공통 패치노트 기반을 준비했어요.'
  ],
  array['web', 'ios', 'android'],
  date '2026-07-19',
  now(),
  true,
  '{"web":"0.1.0","ios":"1.0.0","android":"1.0.0"}'::jsonb,
  false
)
on conflict (version) do update
set title = excluded.title,
    items = excluded.items,
    platforms = excluded.platforms,
    release_date = excluded.release_date,
    is_published = excluded.is_published,
    minimum_versions = excluded.minimum_versions,
    force_update = excluded.force_update,
    updated_at = now();

commit;
