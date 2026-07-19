begin;

create table if not exists public.ai_rate_limit_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz not null default now()
);

create index if not exists ai_rate_limit_events_user_time_idx
  on public.ai_rate_limit_events (user_id, occurred_at desc);
create index if not exists ai_rate_limit_events_ip_time_idx
  on public.ai_rate_limit_events (ip_hash, occurred_at desc);

alter table public.ai_rate_limit_events enable row level security;
drop policy if exists ai_rate_limit_events_deny_direct_access on public.ai_rate_limit_events;
create policy ai_rate_limit_events_deny_direct_access
  on public.ai_rate_limit_events for select
  to authenticated
  using (false);

revoke all on table public.ai_rate_limit_events from anon, authenticated;

create or replace function public.check_ai_rate_limit(
  p_user_id uuid,
  p_ip_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tier text;
  v_user_minute integer;
  v_user_day integer;
  v_ip_minute integer;
  v_ip_day integer;
  v_user_day_limit integer;
begin
  if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'INVALID_AI_USER' using errcode = '22023';
  end if;
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_AI_IP_HASH' using errcode = '22023';
  end if;

  -- Serialize checks for the same user and IP so concurrent requests cannot
  -- all pass before their events are recorded.
  perform pg_advisory_xact_lock(hashtextextended('ai-user:' || p_user_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('ai-ip:' || p_ip_hash, 0));

  select coalesce((select tier from public.ai_usage_accounts where user_id = p_user_id), 'free')
    into v_tier;
  v_user_day_limit := case v_tier when 'royal_ai' then 400 when 'royal' then 160 else 40 end;

  select
    count(*) filter (where occurred_at >= now() - interval '1 minute')::integer,
    count(*) filter (where occurred_at >= now() - interval '1 day')::integer
  into v_user_minute, v_user_day
  from public.ai_rate_limit_events
  where user_id = p_user_id
    and occurred_at >= now() - interval '1 day';

  select
    count(*) filter (where occurred_at >= now() - interval '1 minute')::integer,
    count(*) filter (where occurred_at >= now() - interval '1 day')::integer
  into v_ip_minute, v_ip_day
  from public.ai_rate_limit_events
  where ip_hash = p_ip_hash
    and occurred_at >= now() - interval '1 day';

  if v_user_minute >= 12 then
    raise exception 'AI_RATE_USER_MINUTE' using errcode = 'P0001';
  end if;
  if v_user_day >= v_user_day_limit then
    raise exception 'AI_RATE_USER_DAY' using errcode = 'P0001';
  end if;
  if v_ip_minute >= 60 then
    raise exception 'AI_RATE_IP_MINUTE' using errcode = 'P0001';
  end if;
  if v_ip_day >= 2000 then
    raise exception 'AI_RATE_IP_DAY' using errcode = 'P0001';
  end if;

  insert into public.ai_rate_limit_events (user_id, ip_hash)
  values (p_user_id, p_ip_hash);

  -- Opportunistic retention cleanup keeps raw rate events bounded without
  -- placing a full-table delete on every request.
  if random() < 0.01 then
    delete from public.ai_rate_limit_events
    where occurred_at < now() - interval '2 days';
  end if;

  return jsonb_build_object(
    'tier', v_tier,
    'userMinuteRemaining', 11 - v_user_minute,
    'userDayRemaining', v_user_day_limit - v_user_day - 1
  );
end;
$$;

create or replace function public.reserve_ai_usage(
  p_user_id uuid,
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
  if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'INVALID_AI_USER' using errcode = '22023';
  end if;
  if p_request_id is null or nullif(trim(p_request_type), '') is null then
    raise exception 'INVALID_AI_REQUEST' using errcode = '22023';
  end if;
  if p_points is null or p_points < 1 or p_points > 30 then
    raise exception 'INVALID_AI_POINT_COST' using errcode = '22023';
  end if;

  select * into v_existing
  from public.ai_usage_ledger
  where request_id = p_request_id and user_id = p_user_id;

  if found then
    return jsonb_build_object(
      'requestId', v_existing.request_id,
      'tier', v_existing.tier,
      'points', v_existing.points,
      'status', v_existing.status
    );
  end if;

  insert into public.ai_usage_accounts (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select tier, signup_bonus_remaining
    into v_tier, v_bonus
  from public.ai_usage_accounts
  where user_id = p_user_id
  for update;

  v_monthly_limit := case v_tier when 'royal_ai' then 288 when 'royal' then 69 else 4 end;
  v_daily_limit := case v_tier when 'royal_ai' then 100 when 'royal' then 40 else 8 end;

  select count(*)::integer into v_daily_used
  from public.ai_usage_ledger
  where user_id = p_user_id
    and status in ('reserved', 'consumed')
    and created_at >= v_day_start;

  if v_daily_used >= v_daily_limit then
    raise exception 'AI_DAILY_REQUEST_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  select coalesce(sum(monthly_points_charged), 0)::integer into v_monthly_used
  from public.ai_usage_ledger
  where user_id = p_user_id
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
    where user_id = p_user_id;
  end if;

  insert into public.ai_usage_ledger (
    request_id, user_id, tier, request_type, points,
    monthly_points_charged, bonus_points_charged
  ) values (
    p_request_id, p_user_id, v_tier, trim(p_request_type), p_points,
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
  p_user_id uuid,
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
begin
  if p_user_id is null then
    raise exception 'INVALID_AI_USER' using errcode = '22023';
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
    and user_id = p_user_id
    and status = 'reserved';
end;
$$;

create or replace function public.release_ai_usage(
  p_user_id uuid,
  p_request_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_bonus_refund integer;
begin
  if p_user_id is null then
    raise exception 'INVALID_AI_USER' using errcode = '22023';
  end if;

  select bonus_points_charged into v_bonus_refund
  from public.ai_usage_ledger
  where request_id = p_request_id
    and user_id = p_user_id
    and status = 'reserved'
  for update;

  if not found then return; end if;

  update public.ai_usage_ledger
  set status = 'released',
      metadata = metadata || jsonb_build_object('releaseReason', left(coalesce(p_reason, 'request_failed'), 80)),
      completed_at = now()
  where request_id = p_request_id and user_id = p_user_id;

  if v_bonus_refund > 0 then
    update public.ai_usage_accounts
    set signup_bonus_remaining = signup_bonus_remaining + v_bonus_refund,
        updated_at = now()
    where user_id = p_user_id;
  end if;
end;
$$;

-- Remove the Phase 0 client-callable overloads.
revoke all on function public.reserve_ai_usage(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.finalize_ai_usage(uuid, text, integer, integer, integer, integer, numeric, jsonb) from public, anon, authenticated;
revoke all on function public.release_ai_usage(uuid, text) from public, anon, authenticated;
drop function public.reserve_ai_usage(uuid, text, integer);
drop function public.finalize_ai_usage(uuid, text, integer, integer, integer, integer, numeric, jsonb);
drop function public.release_ai_usage(uuid, text);

revoke all on function public.check_ai_rate_limit(uuid, text) from public, anon, authenticated;
revoke all on function public.reserve_ai_usage(uuid, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.finalize_ai_usage(uuid, uuid, text, integer, integer, integer, integer, numeric, jsonb) from public, anon, authenticated;
revoke all on function public.release_ai_usage(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.check_ai_rate_limit(uuid, text) to service_role;
grant execute on function public.reserve_ai_usage(uuid, uuid, text, integer) to service_role;
grant execute on function public.finalize_ai_usage(uuid, uuid, text, integer, integer, integer, integer, numeric, jsonb) to service_role;
grant execute on function public.release_ai_usage(uuid, uuid, text) to service_role;

commit;
