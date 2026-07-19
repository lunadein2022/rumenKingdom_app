-- Runtime configuration shared by web, iOS and Android.
begin;

create table if not exists public.app_runtime_config (
  environment text primary key default 'production' check (environment in ('production', 'staging')),
  api_version text not null default '2026-07-19',
  minimum_versions jsonb not null default '{"web":"0.1.0","ios":"1.0.0","android":"1.0.0"}'::jsonb,
  force_update boolean not null default false,
  maintenance jsonb not null default '{"enabled":false,"blocking":false,"title":"왕국 통신망을 정비하고 있어요","message":"잠시 후 다시 찾아와 주세요."}'::jsonb,
  feature_flags jsonb not null default '{}'::jsonb,
  ai_point_policy jsonb not null default '{}'::jsonb,
  plan_catalog jsonb not null default '{}'::jsonb,
  store_urls jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_runtime_api_version_length check (char_length(api_version) between 1 and 40),
  constraint app_runtime_minimum_versions_object check (jsonb_typeof(minimum_versions) = 'object'),
  constraint app_runtime_maintenance_object check (jsonb_typeof(maintenance) = 'object'),
  constraint app_runtime_feature_flags_object check (jsonb_typeof(feature_flags) = 'object'),
  constraint app_runtime_ai_policy_object check (jsonb_typeof(ai_point_policy) = 'object'),
  constraint app_runtime_plan_catalog_object check (jsonb_typeof(plan_catalog) = 'object'),
  constraint app_runtime_store_urls_object check (jsonb_typeof(store_urls) = 'object')
);

create table if not exists public.app_announcements (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'notice' check (kind in ('notice', 'maintenance', 'event')),
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  title text not null,
  message text not null,
  action_label text,
  action_url text,
  platforms text[] not null default array['web', 'ios', 'android'],
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_published boolean not null default false,
  dismissible boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_announcements_title_length check (char_length(title) between 1 and 120),
  constraint app_announcements_message_length check (char_length(message) between 1 and 1000),
  constraint app_announcements_platforms_allowed check (platforms <@ array['web', 'ios', 'android']::text[]),
  constraint app_announcements_window check (ends_at is null or ends_at > starts_at)
);
create index if not exists app_announcements_active_idx
  on public.app_announcements(is_published, starts_at desc, ends_at);

create table if not exists public.app_catalog_items (
  product_key text primary key,
  category text not null check (category in ('theme', 'widget')),
  title text not null,
  description text not null default '',
  price_krw integer not null default 0 check (price_krw >= 0),
  entitlement_key text not null,
  image_url text,
  platforms text[] not null default array['ios', 'android'],
  active boolean not null default false,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_catalog_key_length check (char_length(product_key) between 1 and 120),
  constraint app_catalog_title_length check (char_length(title) between 1 and 120),
  constraint app_catalog_platforms_allowed check (platforms <@ array['web', 'ios', 'android']::text[])
);

create table if not exists public.app_config_audit_log (
  id bigint generated always as identity primary key,
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_key text not null,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now()
);
create index if not exists app_config_audit_created_idx on public.app_config_audit_log(created_at desc);

insert into public.app_runtime_config(
  environment, api_version, minimum_versions, force_update, maintenance,
  feature_flags, ai_point_policy, plan_catalog, store_urls
) values (
  'production',
  '2026-07-19',
  '{"web":"0.1.0","ios":"1.0.0","android":"1.0.0"}'::jsonb,
  false,
  '{"enabled":false,"blocking":false,"title":"왕국 통신망을 정비하고 있어요","message":"잠시 후 다시 찾아와 주세요.","startsAt":null,"endsAt":null}'::jsonb,
  '{"ritaAi":true,"fileAnalysis":true,"premiumThemes":false,"widgets":true,"quickAiWidget":true}'::jsonb,
  '{
    "tiers": {
      "free": {"monthlyPoints":4,"dailyRequests":8,"signupBonus":12},
      "royal": {"monthlyPoints":69,"dailyRequests":40,"signupBonus":12},
      "royal_ai": {"monthlyPoints":288,"dailyRequests":100,"signupBonus":12}
    },
    "requestCosts": {
      "chat":{"concise":1,"warm":1,"detailed":4},
      "interpretRequest":1,
      "attachment":{"businessCard":5,"audioBase":5,"audioPerMiB":4,"documentBase":5,"documentPerMiB":5,"maximum":30}
    }
  }'::jsonb,
  '{
    "trialDays":14,
    "plans":{
      "free":{"name":"Free","monthlyPriceKrw":0,"annualPriceKrw":0,"features":["일정·퀘스트·일기 기본 기능","웹·iOS·Android 동기화","기본 위젯"]},
      "royal":{"name":"Royal","monthlyPriceKrw":4900,"annualPriceKrw":39000,"features":["Free의 모든 기능","리타 AI 월 69포인트","리타 대화 위젯","프리미엄 편의 기능"]},
      "royal_ai":{"name":"Royal AI","monthlyPriceKrw":9900,"annualPriceKrw":79000,"features":["Royal의 모든 기능","리타 AI 월 288포인트","Sonnet 상세 분석","파일·음성 분석 우선 이용"]}
    }
  }'::jsonb,
  '{"ios":null,"android":null}'::jsonb
)
on conflict (environment) do nothing;

create or replace function public.get_public_app_bootstrap(p_platform text default 'web')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  platform_name text := case when p_platform in ('web', 'ios', 'android') then p_platform else 'web' end;
  config_value jsonb;
begin
  select to_jsonb(config) - 'updated_by' into config_value
  from public.app_runtime_config config where environment = 'production';
  return jsonb_build_object(
    'config', coalesce(config_value, '{}'::jsonb),
    'announcements', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.severity desc, item.starts_at desc)
      from (
        select id, kind, severity, title, message, action_label, action_url,
               starts_at, ends_at, dismissible, updated_at
        from public.app_announcements
        where is_published and starts_at <= now()
          and (ends_at is null or ends_at > now())
          and platforms @> array[platform_name]
      ) item
    ), '[]'::jsonb),
    'catalog', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.sort_order, item.product_key)
      from (
        select product_key, category, title, description, price_krw,
               entitlement_key, image_url, platforms, metadata
        from public.app_catalog_items
        where active and platforms @> array[platform_name]
      ) item
    ), '[]'::jsonb),
    'releases', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.published_at desc)
      from (
        select version, title, items, release_date, published_at,
               minimum_versions, force_update
        from public.app_releases
        where is_published and published_at <= now()
          and platforms @> array[platform_name]
        order by published_at desc limit 20
      ) item
    ), '[]'::jsonb),
    'serverTime', now()
  );
end;
$$;

-- The metering RPC uses the live policy. Invalid or missing values always fall
-- back to the approved launch limits instead of granting unlimited usage.
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
  v_policy jsonb;
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
  if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id) then raise exception 'INVALID_AI_USER' using errcode = '22023'; end if;
  if p_request_id is null or nullif(trim(p_request_type), '') is null then raise exception 'INVALID_AI_REQUEST' using errcode = '22023'; end if;
  if p_points is null or p_points < 1 or p_points > 30 then raise exception 'INVALID_AI_POINT_COST' using errcode = '22023'; end if;

  select * into v_existing from public.ai_usage_ledger where request_id = p_request_id and user_id = p_user_id;
  if found then return jsonb_build_object('requestId',v_existing.request_id,'tier',v_existing.tier,'points',v_existing.points,'status',v_existing.status); end if;

  insert into public.ai_usage_accounts(user_id) values (p_user_id) on conflict (user_id) do nothing;
  select tier, signup_bonus_remaining into v_tier, v_bonus
  from public.ai_usage_accounts where user_id = p_user_id for update;
  select ai_point_policy into v_policy from public.app_runtime_config where environment = 'production';

  v_monthly_limit := coalesce(nullif(v_policy #>> array['tiers', v_tier, 'monthlyPoints'], '')::integer,
    case v_tier when 'royal_ai' then 288 when 'royal' then 69 else 4 end);
  v_daily_limit := coalesce(nullif(v_policy #>> array['tiers', v_tier, 'dailyRequests'], '')::integer,
    case v_tier when 'royal_ai' then 100 when 'royal' then 40 else 8 end);
  v_monthly_limit := greatest(0, least(v_monthly_limit, 100000));
  v_daily_limit := greatest(1, least(v_daily_limit, 10000));

  select count(*)::integer into v_daily_used from public.ai_usage_ledger
  where user_id = p_user_id and status in ('reserved','consumed') and created_at >= v_day_start;
  if v_daily_used >= v_daily_limit then raise exception 'AI_DAILY_REQUEST_LIMIT_REACHED' using errcode = 'P0001'; end if;

  select coalesce(sum(monthly_points_charged),0)::integer into v_monthly_used
  from public.ai_usage_ledger where user_id = p_user_id and status in ('reserved','consumed') and created_at >= v_month_start;
  v_monthly_charge := least(p_points, greatest(v_monthly_limit - v_monthly_used, 0));
  v_bonus_charge := p_points - v_monthly_charge;
  if v_bonus_charge > v_bonus then raise exception 'AI_MONTHLY_POINTS_EXHAUSTED' using errcode = 'P0001'; end if;
  if v_bonus_charge > 0 then update public.ai_usage_accounts set signup_bonus_remaining = signup_bonus_remaining - v_bonus_charge, updated_at = now() where user_id = p_user_id; end if;

  insert into public.ai_usage_ledger(request_id,user_id,tier,request_type,points,monthly_points_charged,bonus_points_charged)
  values (p_request_id,p_user_id,v_tier,trim(p_request_type),p_points,v_monthly_charge,v_bonus_charge);
  return jsonb_build_object('requestId',p_request_id,'tier',v_tier,'points',p_points,'status','reserved',
    'monthlyRemaining',v_monthly_limit-v_monthly_used-v_monthly_charge,'bonusRemaining',v_bonus-v_bonus_charge,
    'totalRemaining',v_monthly_limit-v_monthly_used-v_monthly_charge+v_bonus-v_bonus_charge);
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
  v_policy jsonb;
  v_monthly_limit integer;
  v_monthly_used integer;
  v_month_start timestamptz := date_trunc('month', timezone('Asia/Seoul', now())) at time zone 'Asia/Seoul';
begin
  if v_user_id is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode = '28000'; end if;
  insert into public.ai_usage_accounts(user_id) values (v_user_id) on conflict (user_id) do nothing;
  select tier, signup_bonus_remaining into v_tier, v_bonus from public.ai_usage_accounts where user_id = v_user_id;
  select ai_point_policy into v_policy from public.app_runtime_config where environment = 'production';
  v_monthly_limit := coalesce(nullif(v_policy #>> array['tiers',v_tier,'monthlyPoints'],'')::integer,
    case v_tier when 'royal_ai' then 288 when 'royal' then 69 else 4 end);
  v_monthly_limit := greatest(0, least(v_monthly_limit, 100000));
  select coalesce(sum(monthly_points_charged),0)::integer into v_monthly_used from public.ai_usage_ledger
  where user_id = v_user_id and status in ('reserved','consumed') and created_at >= v_month_start;
  return jsonb_build_object('tier',v_tier,'monthlyLimit',v_monthly_limit,'monthlyUsed',v_monthly_used,
    'monthlyRemaining',greatest(v_monthly_limit-v_monthly_used,0),'bonusRemaining',v_bonus,
    'totalRemaining',greatest(v_monthly_limit-v_monthly_used,0)+v_bonus);
end;
$$;

alter table public.app_runtime_config enable row level security;
alter table public.app_announcements enable row level security;
alter table public.app_catalog_items enable row level security;
alter table public.app_config_audit_log enable row level security;

drop policy if exists app_runtime_public_read on public.app_runtime_config;
create policy app_runtime_public_read on public.app_runtime_config for select to anon, authenticated using (environment = 'production');
drop policy if exists app_announcements_public_read on public.app_announcements;
create policy app_announcements_public_read on public.app_announcements for select to anon, authenticated
  using (is_published and starts_at <= now() and (ends_at is null or ends_at > now()));
drop policy if exists app_catalog_public_read on public.app_catalog_items;
create policy app_catalog_public_read on public.app_catalog_items for select to anon, authenticated using (active);

revoke all on public.app_runtime_config, public.app_announcements, public.app_catalog_items, public.app_config_audit_log from public, anon, authenticated;
grant select on public.app_runtime_config, public.app_announcements, public.app_catalog_items to anon, authenticated;
grant all on public.app_runtime_config, public.app_announcements, public.app_catalog_items, public.app_config_audit_log to service_role;

revoke all on function public.get_public_app_bootstrap(text) from public;
grant execute on function public.get_public_app_bootstrap(text) to anon, authenticated, service_role;
revoke all on function public.reserve_ai_usage(uuid,uuid,text,integer) from public, anon, authenticated;
grant execute on function public.reserve_ai_usage(uuid,uuid,text,integer) to service_role;
revoke all on function public.get_my_ai_usage() from public, anon;
grant execute on function public.get_my_ai_usage() to authenticated, service_role;

commit;
