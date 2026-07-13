begin;

create table if not exists public.relationship_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#8f78b5',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint relationship_groups_name_not_blank check (length(trim(name)) > 0)
);

create unique index if not exists relationship_groups_user_name_idx
  on public.relationship_groups (user_id, lower(name));
create index if not exists relationship_groups_user_order_idx
  on public.relationship_groups (user_id, sort_order, name);

create table if not exists public.relationship_group_members (
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.relationship_groups(id) on delete cascade,
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, relationship_id)
);

create index if not exists relationship_group_members_user_idx on public.relationship_group_members (user_id);
create index if not exists relationship_group_members_relationship_idx on public.relationship_group_members (relationship_id);

alter table public.relationship_groups enable row level security;
alter table public.relationship_group_members enable row level security;

drop policy if exists relationship_groups_own_rows on public.relationship_groups;
create policy relationship_groups_own_rows on public.relationship_groups
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists relationship_group_members_select_own on public.relationship_group_members;
drop policy if exists relationship_group_members_insert_own on public.relationship_group_members;
drop policy if exists relationship_group_members_delete_own on public.relationship_group_members;
create policy relationship_group_members_select_own on public.relationship_group_members
  for select to authenticated using (auth.uid() = user_id);
create policy relationship_group_members_insert_own on public.relationship_group_members
  for insert to authenticated with check (
    auth.uid() = user_id
    and exists (select 1 from public.relationship_groups g where g.id = group_id and g.user_id = auth.uid())
    and exists (select 1 from public.relationships r where r.id = relationship_id and r.user_id = auth.uid())
  );
create policy relationship_group_members_delete_own on public.relationship_group_members
  for delete to authenticated using (auth.uid() = user_id);

drop trigger if exists relationship_groups_touch_updated_at on public.relationship_groups;
create trigger relationship_groups_touch_updated_at before update on public.relationship_groups
  for each row execute function public.touch_updated_at();

commit;
