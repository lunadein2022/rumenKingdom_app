begin;

create table if not exists public.internal_account_allowlist (
  email text primary key check (email = lower(trim(email))),
  role text not null check (role in ('owner', 'admin', 'support')),
  complimentary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'support')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_benefit_grants (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  admin_user_id uuid not null references auth.users(id),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_email text not null,
  benefit_type text not null check (benefit_type in ('ai_points', 'cosmetic', 'all_access')),
  benefit_key text not null,
  amount integer not null default 1 check (amount between 1 and 10000),
  expires_at timestamptz,
  reason text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (expires_at is null or expires_at > created_at)
);

create table if not exists public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_key text not null,
  source_grant_id uuid references public.admin_benefit_grants(id) on delete set null,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists admin_benefit_grants_recipient_idx
  on public.admin_benefit_grants (recipient_user_id, created_at desc);
create index if not exists admin_benefit_grants_admin_idx
  on public.admin_benefit_grants (admin_user_id, created_at desc);
create index if not exists user_entitlements_active_idx
  on public.user_entitlements (user_id, entitlement_key)
  where revoked_at is null;

alter table public.internal_account_allowlist enable row level security;
alter table public.app_admins enable row level security;
alter table public.admin_benefit_grants enable row level security;
alter table public.user_entitlements enable row level security;

revoke all on table public.internal_account_allowlist from public, anon, authenticated;
revoke all on table public.app_admins from public, anon, authenticated;
revoke all on table public.admin_benefit_grants from public, anon, authenticated;
revoke all on table public.user_entitlements from public, anon, authenticated;

create or replace function public.apply_internal_account_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_internal public.internal_account_allowlist%rowtype;
begin
  select * into v_internal
  from public.internal_account_allowlist
  where email = lower(trim(new.email))
    and new.email_confirmed_at is not null;

  if not found then return new; end if;

  insert into public.app_admins (user_id, role, active)
  values (new.id, v_internal.role, true)
  on conflict (user_id) do update
  set role = excluded.role, active = true, updated_at = now();

  if v_internal.complimentary then
    insert into public.ai_usage_accounts (user_id, tier, signup_bonus_remaining)
    values (new.id, 'royal_ai', 10000)
    on conflict (user_id) do update
    set tier = 'royal_ai',
        signup_bonus_remaining = greatest(public.ai_usage_accounts.signup_bonus_remaining, 10000),
        updated_at = now();

    if not exists (
      select 1 from public.user_entitlements
      where user_id = new.id and entitlement_key = 'all_access' and revoked_at is null
    ) then
      insert into public.user_entitlements (user_id, entitlement_key, metadata)
      values (new.id, 'all_access', jsonb_build_object('source', 'internal_account'));
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.apply_internal_account_from_auth() from public, anon, authenticated;

drop trigger if exists apply_internal_account_on_auth_user on auth.users;
create trigger apply_internal_account_on_auth_user
after insert or update of email, email_confirmed_at on auth.users
for each row execute function public.apply_internal_account_from_auth();

-- Apply the allowlist immediately when the owner account already exists.
insert into public.app_admins (user_id, role, active)
select u.id, a.role, true
from auth.users u
join public.internal_account_allowlist a on a.email = lower(trim(u.email))
where u.email_confirmed_at is not null
on conflict (user_id) do update
set role = excluded.role, active = true, updated_at = now();

insert into public.ai_usage_accounts (user_id, tier, signup_bonus_remaining)
select u.id, 'royal_ai', 10000
from auth.users u
join public.internal_account_allowlist a on a.email = lower(trim(u.email))
where a.complimentary and u.email_confirmed_at is not null
on conflict (user_id) do update
set tier = 'royal_ai',
    signup_bonus_remaining = greatest(public.ai_usage_accounts.signup_bonus_remaining, 10000),
    updated_at = now();

insert into public.user_entitlements (user_id, entitlement_key, metadata)
select u.id, 'all_access', jsonb_build_object('source', 'internal_account')
from auth.users u
join public.internal_account_allowlist a on a.email = lower(trim(u.email))
where a.complimentary and u.email_confirmed_at is not null
  and not exists (
    select 1 from public.user_entitlements e
    where e.user_id = u.id and e.entitlement_key = 'all_access' and e.revoked_at is null
  );

create or replace function public.provision_internal_account(
  p_email text,
  p_role text default 'owner',
  p_complimentary boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(trim(p_email));
  v_user auth.users%rowtype;
begin
  if v_email is null or length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'INVALID_INTERNAL_ACCOUNT_EMAIL' using errcode = '22023';
  end if;
  if p_role not in ('owner', 'admin', 'support') then
    raise exception 'INVALID_INTERNAL_ACCOUNT_ROLE' using errcode = '22023';
  end if;

  insert into public.internal_account_allowlist (email, role, complimentary)
  values (v_email, p_role, coalesce(p_complimentary, false))
  on conflict (email) do update
  set role = excluded.role,
      complimentary = excluded.complimentary,
      updated_at = now();

  select * into v_user
  from auth.users
  where lower(email) = v_email and email_confirmed_at is not null;

  if not found then
    return jsonb_build_object('status', 'pending', 'email', v_email, 'reason', 'signup_or_email_confirmation_required');
  end if;

  insert into public.app_admins (user_id, role, active)
  values (v_user.id, p_role, true)
  on conflict (user_id) do update
  set role = excluded.role, active = true, updated_at = now();

  if coalesce(p_complimentary, false) then
    insert into public.ai_usage_accounts (user_id, tier, signup_bonus_remaining)
    values (v_user.id, 'royal_ai', 10000)
    on conflict (user_id) do update
    set tier = 'royal_ai',
        signup_bonus_remaining = greatest(public.ai_usage_accounts.signup_bonus_remaining, 10000),
        updated_at = now();

    if not exists (
      select 1 from public.user_entitlements
      where user_id = v_user.id and entitlement_key = 'all_access' and revoked_at is null
    ) then
      insert into public.user_entitlements (user_id, entitlement_key, metadata)
      values (v_user.id, 'all_access', jsonb_build_object('source', 'internal_account'));
    end if;
  end if;

  return jsonb_build_object('status', 'ready', 'email', v_email, 'userId', v_user.id, 'role', p_role, 'complimentary', p_complimentary);
end;
$$;

revoke all on function public.provision_internal_account(text, text, boolean) from public, anon, authenticated, service_role;

create or replace function public.admin_get_context(p_admin_user_id uuid)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select case when a.user_id is null
    then jsonb_build_object('isAdmin', false)
    else jsonb_build_object('isAdmin', true, 'role', a.role)
  end
  from (select 1) seed
  left join public.app_admins a
    on a.user_id = p_admin_user_id and a.active;
$$;

create or replace function public.admin_find_user(p_admin_user_id uuid, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  v_user auth.users%rowtype;
  v_account public.ai_usage_accounts%rowtype;
  v_entitlements jsonb;
begin
  if not exists (
    select 1 from public.app_admins
    where user_id = p_admin_user_id and active and role in ('owner', 'admin', 'support')
  ) then
    raise exception 'ADMIN_FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_user from auth.users where lower(email) = lower(trim(p_email));
  if not found then raise exception 'ADMIN_USER_NOT_FOUND' using errcode = 'P0002'; end if;

  select * into v_account from public.ai_usage_accounts where user_id = v_user.id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'key', entitlement_key, 'expiresAt', expires_at, 'createdAt', created_at
  ) order by created_at desc), '[]'::jsonb)
  into v_entitlements
  from public.user_entitlements
  where user_id = v_user.id
    and revoked_at is null
    and (expires_at is null or expires_at > now());

  return jsonb_build_object(
    'userId', v_user.id,
    'email', v_user.email,
    'createdAt', v_user.created_at,
    'tier', coalesce(v_account.tier, 'free'),
    'bonusPoints', coalesce(v_account.signup_bonus_remaining, 12),
    'entitlements', v_entitlements
  );
end;
$$;

create or replace function public.admin_grant_benefit(
  p_admin_user_id uuid,
  p_recipient_email text,
  p_benefit_type text,
  p_benefit_key text,
  p_amount integer,
  p_expires_at timestamptz,
  p_reason text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_recipient_id uuid;
  v_recipient_email text;
  v_grant_id uuid;
begin
  select role into v_role
  from public.app_admins
  where user_id = p_admin_user_id and active;

  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'ADMIN_FORBIDDEN' using errcode = '42501';
  end if;
  if p_benefit_type not in ('ai_points', 'cosmetic', 'all_access') then
    raise exception 'ADMIN_INVALID_BENEFIT_TYPE' using errcode = '22023';
  end if;
  if p_amount is null or p_amount < 1 or p_amount > 10000 then
    raise exception 'ADMIN_INVALID_AMOUNT' using errcode = '22023';
  end if;
  if p_idempotency_key is null then
    raise exception 'ADMIN_INVALID_IDEMPOTENCY_KEY' using errcode = '22023';
  end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'ADMIN_INVALID_EXPIRY' using errcode = '22023';
  end if;
  if p_benefit_type = 'cosmetic' and nullif(trim(p_benefit_key), '') is null then
    raise exception 'ADMIN_BENEFIT_KEY_REQUIRED' using errcode = '22023';
  end if;

  select id, email into v_recipient_id, v_recipient_email
  from auth.users
  where lower(email) = lower(trim(p_recipient_email));
  if not found then raise exception 'ADMIN_USER_NOT_FOUND' using errcode = 'P0002'; end if;

  select id into v_grant_id
  from public.admin_benefit_grants
  where idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('grantId', v_grant_id, 'duplicate', true);
  end if;

  insert into public.admin_benefit_grants (
    idempotency_key, admin_user_id, recipient_user_id, recipient_email,
    benefit_type, benefit_key, amount, expires_at, reason
  ) values (
    p_idempotency_key, p_admin_user_id, v_recipient_id, v_recipient_email,
    p_benefit_type,
    case when p_benefit_type = 'ai_points' then 'rita_points'
         when p_benefit_type = 'all_access' then 'all_access'
         else trim(p_benefit_key) end,
    p_amount, p_expires_at, left(coalesce(trim(p_reason), ''), 500)
  ) returning id into v_grant_id;

  if p_benefit_type = 'ai_points' then
    insert into public.ai_usage_accounts (user_id, signup_bonus_remaining)
    values (v_recipient_id, 12 + p_amount)
    on conflict (user_id) do update
    set signup_bonus_remaining = public.ai_usage_accounts.signup_bonus_remaining + p_amount,
        updated_at = now();
  else
    insert into public.user_entitlements (
      user_id, entitlement_key, source_grant_id, expires_at,
      metadata
    ) values (
      v_recipient_id,
      case when p_benefit_type = 'all_access' then 'all_access' else trim(p_benefit_key) end,
      v_grant_id,
      p_expires_at,
      jsonb_build_object('grantedBy', p_admin_user_id, 'benefitType', p_benefit_type)
    );
  end if;

  return jsonb_build_object(
    'grantId', v_grant_id,
    'duplicate', false,
    'recipientEmail', v_recipient_email,
    'benefitType', p_benefit_type,
    'benefitKey', case when p_benefit_type = 'ai_points' then 'rita_points'
                       when p_benefit_type = 'all_access' then 'all_access'
                       else trim(p_benefit_key) end,
    'amount', p_amount,
    'expiresAt', p_expires_at
  );
end;
$$;

create or replace function public.admin_list_benefit_grants(p_admin_user_id uuid, p_limit integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  v_result jsonb;
begin
  if not exists (
    select 1 from public.app_admins
    where user_id = p_admin_user_id and active and role in ('owner', 'admin', 'support')
  ) then
    raise exception 'ADMIN_FORBIDDEN' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(to_jsonb(grant_row) order by grant_row.created_at desc), '[]'::jsonb)
  into v_result
  from (
    select id, recipient_email as "recipientEmail", benefit_type as "benefitType",
      benefit_key as "benefitKey", amount, expires_at as "expiresAt", reason,
      created_at as "createdAt", revoked_at as "revokedAt"
    from public.admin_benefit_grants
    order by created_at desc
    limit least(greatest(coalesce(p_limit, 30), 1), 100)
  ) grant_row;

  return v_result;
end;
$$;

revoke all on function public.admin_get_context(uuid) from public, anon, authenticated;
revoke all on function public.admin_find_user(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_grant_benefit(uuid, text, text, text, integer, timestamptz, text, uuid) from public, anon, authenticated;
revoke all on function public.admin_list_benefit_grants(uuid, integer) from public, anon, authenticated;
grant execute on function public.admin_get_context(uuid) to service_role;
grant execute on function public.admin_find_user(uuid, text) to service_role;
grant execute on function public.admin_grant_benefit(uuid, text, text, text, integer, timestamptz, text, uuid) to service_role;
grant execute on function public.admin_list_benefit_grants(uuid, integer) to service_role;

commit;
