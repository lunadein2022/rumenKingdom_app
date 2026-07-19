begin;

create table if not exists public.ai_usage_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'royal', 'royal_ai')),
  signup_bonus_remaining integer not null default 12 check (signup_bonus_remaining >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_usage_ledger (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  tier text not null check (tier in ('free', 'royal', 'royal_ai')),
  request_type text not null,
  provider text not null default 'anthropic',
  model text,
  points integer not null check (points between 1 and 30),
  monthly_points_charged integer not null default 0 check (monthly_points_charged >= 0),
  bonus_points_charged integer not null default 0 check (bonus_points_charged >= 0),
  status text not null default 'reserved' check (status in ('reserved', 'consumed', 'released')),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  cache_write_tokens integer not null default 0 check (cache_write_tokens >= 0),
  cache_read_tokens integer not null default 0 check (cache_read_tokens >= 0),
  estimated_cost_usd numeric(12, 8) not null default 0 check (estimated_cost_usd >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists ai_usage_ledger_user_created_idx
  on public.ai_usage_ledger (user_id, created_at desc);
create index if not exists ai_usage_ledger_active_usage_idx
  on public.ai_usage_ledger (user_id, status, created_at)
  where status in ('reserved', 'consumed');

alter table public.ai_usage_accounts enable row level security;
alter table public.ai_usage_ledger enable row level security;

drop policy if exists ai_usage_accounts_select_own on public.ai_usage_accounts;
create policy ai_usage_accounts_select_own
  on public.ai_usage_accounts for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists ai_usage_ledger_deny_direct_access on public.ai_usage_ledger;
create policy ai_usage_ledger_deny_direct_access
  on public.ai_usage_ledger for select
  to authenticated
  using (false);

-- The explicit deny policy also keeps schema verification honest. Authenticated
-- callers can only access ledger-derived totals through the narrow RPC below.

create or replace function public.reserve_ai_usage(
  p_request_id uuid,
  p_request_type text,
  p_points integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_tier text;
  v_bonus integer;
  v_monthly_limit integer;
  v_daily_limit integer;
  v_month_start timestamptz := date_trunc('month', timezone('Asia/Seoul', now())) at time zone 'Asia/Seoul';
  v_day_start timestamptz := date_trunc('day', timezone('Asia/Seoul', now())) at time zone 'Asia/Seoul';
  v_monthly_used integer;
  v_daily_used integer;
  v_monthly_charge integer;
  v_bonus_charge integer;
  v_existing public.ai_usage_ledger%rowtype;
begin
  if v_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '28000';
  end if;
  if p_request_id is null or nullif(trim(p_request_type), '') is null then
    raise exception 'INVALID_AI_REQUEST' using errcode = '22023';
  end if;
  if p_points is null or p_points < 1 or p_points > 30 then
    raise exception 'INVALID_AI_POINT_COST' using errcode = '22023';
  end if;

  select * into v_existing
  from public.ai_usage_ledger
  where request_id = p_request_id and user_id = v_user_id;

  if found then
    return jsonb_build_object(
      'requestId', v_existing.request_id,
      'tier', v_existing.tier,
      'points', v_existing.points,
      'status', v_existing.status
    );
  end if;

  insert into public.ai_usage_accounts (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select tier, signup_bonus_remaining
    into v_tier, v_bonus
  from public.ai_usage_accounts
  where user_id = v_user_id
  for update;

  v_monthly_limit := case v_tier when 'royal_ai' then 288 when 'royal' then 69 else 4 end;
  v_daily_limit := case v_tier when 'royal_ai' then 100 when 'royal' then 40 else 8 end;

  select count(*)::integer
    into v_daily_used
  from public.ai_usage_ledger
  where user_id = v_user_id
    and status in ('reserved', 'consumed')
    and created_at >= v_day_start;

  if v_daily_used >= v_daily_limit then
    raise exception 'AI_DAILY_REQUEST_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  select coalesce(sum(monthly_points_charged), 0)::integer
    into v_monthly_used
  from public.ai_usage_ledger
  where user_id = v_user_id
    and status in ('reserved', 'consumed')
    and created_at >= v_month_start;

  v_monthly_charge := least(p_points, greatest(v_monthly_limit - v_monthly_used, 0));
  v_bonus_charge := p_points - v_monthly_charge;

  if v_bonus_charge > v_bonus then
    raise exception 'AI_MONTHLY_POINTS_EXHAUSTED' using errcode = 'P0001';
  end if;

  if v_bonus_charge > 0 then
    update public.ai_usage_accounts
    set signup_bonus_remaining = signup_bonus_remaining - v_bonus_charge,
        updated_at = now()
    where user_id = v_user_id;
  end if;

  insert into public.ai_usage_ledger (
    request_id, user_id, tier, request_type, points,
    monthly_points_charged, bonus_points_charged
  ) values (
    p_request_id, v_user_id, v_tier, trim(p_request_type), p_points,
    v_monthly_charge, v_bonus_charge
  );

  return jsonb_build_object(
    'requestId', p_request_id,
    'tier', v_tier,
    'points', p_points,
    'status', 'reserved',
    'monthlyRemaining', v_monthly_limit - v_monthly_used - v_monthly_charge,
    'bonusRemaining', v_bonus - v_bonus_charge,
    'totalRemaining', v_monthly_limit - v_monthly_used - v_monthly_charge + v_bonus - v_bonus_charge
  );
end;
$$;

create or replace function public.finalize_ai_usage(
  p_request_id uuid,
  p_model text,
  p_input_tokens integer default 0,
  p_output_tokens integer default 0,
  p_cache_write_tokens integer default 0,
  p_cache_read_tokens integer default 0,
  p_estimated_cost_usd numeric default 0,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '28000';
  end if;

  update public.ai_usage_ledger
  set status = 'consumed',
      model = nullif(trim(p_model), ''),
      input_tokens = greatest(coalesce(p_input_tokens, 0), 0),
      output_tokens = greatest(coalesce(p_output_tokens, 0), 0),
      cache_write_tokens = greatest(coalesce(p_cache_write_tokens, 0), 0),
      cache_read_tokens = greatest(coalesce(p_cache_read_tokens, 0), 0),
      estimated_cost_usd = greatest(coalesce(p_estimated_cost_usd, 0), 0),
      metadata = coalesce(p_metadata, '{}'::jsonb),
      completed_at = now()
  where request_id = p_request_id
    and user_id = v_user_id
    and status = 'reserved';
end;
$$;

create or replace function public.release_ai_usage(
  p_request_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_bonus_refund integer;
begin
  if v_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '28000';
  end if;

  select bonus_points_charged
    into v_bonus_refund
  from public.ai_usage_ledger
  where request_id = p_request_id
    and user_id = v_user_id
    and status = 'reserved'
  for update;

  if not found then return; end if;

  update public.ai_usage_ledger
  set status = 'released',
      metadata = metadata || jsonb_build_object('releaseReason', coalesce(p_reason, 'request_failed')),
      completed_at = now()
  where request_id = p_request_id and user_id = v_user_id;

  if v_bonus_refund > 0 then
    update public.ai_usage_accounts
    set signup_bonus_remaining = signup_bonus_remaining + v_bonus_refund,
        updated_at = now()
    where user_id = v_user_id;
  end if;
end;
$$;

create or replace function public.get_my_ai_usage()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_tier text;
  v_bonus integer;
  v_monthly_limit integer;
  v_monthly_used integer;
  v_month_start timestamptz := date_trunc('month', timezone('Asia/Seoul', now())) at time zone 'Asia/Seoul';
begin
  if v_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '28000';
  end if;

  insert into public.ai_usage_accounts (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select tier, signup_bonus_remaining into v_tier, v_bonus
  from public.ai_usage_accounts where user_id = v_user_id;

  v_monthly_limit := case v_tier when 'royal_ai' then 288 when 'royal' then 69 else 4 end;
  select coalesce(sum(monthly_points_charged), 0)::integer into v_monthly_used
  from public.ai_usage_ledger
  where user_id = v_user_id
    and status in ('reserved', 'consumed')
    and created_at >= v_month_start;

  return jsonb_build_object(
    'tier', v_tier,
    'monthlyLimit', v_monthly_limit,
    'monthlyUsed', v_monthly_used,
    'monthlyRemaining', greatest(v_monthly_limit - v_monthly_used, 0),
    'bonusRemaining', v_bonus,
    'totalRemaining', greatest(v_monthly_limit - v_monthly_used, 0) + v_bonus
  );
end;
$$;

revoke all on table public.ai_usage_accounts from anon, authenticated;
revoke all on table public.ai_usage_ledger from anon, authenticated;
grant select on table public.ai_usage_accounts to authenticated;

revoke all on function public.reserve_ai_usage(uuid, text, integer) from public;
revoke all on function public.finalize_ai_usage(uuid, text, integer, integer, integer, integer, numeric, jsonb) from public;
revoke all on function public.release_ai_usage(uuid, text) from public;
revoke all on function public.get_my_ai_usage() from public;
grant execute on function public.reserve_ai_usage(uuid, text, integer) to authenticated;
grant execute on function public.finalize_ai_usage(uuid, text, integer, integer, integer, integer, numeric, jsonb) to authenticated;
grant execute on function public.release_ai_usage(uuid, text) to authenticated;
grant execute on function public.get_my_ai_usage() to authenticated;

commit;
