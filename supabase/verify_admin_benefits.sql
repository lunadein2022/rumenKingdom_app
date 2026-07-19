-- Run after 202607190008_admin_benefits.sql.
with protected_tables(name) as (
  values ('internal_account_allowlist'), ('app_admins'), ('admin_benefit_grants'), ('user_entitlements')
), rls_check as (
  select count(*) filter (where not c.relrowsecurity) as failures
  from protected_tables p
  join pg_class c on c.relname = p.name
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
), owner_state as (
  select count(*) as allowlisted,
    count(*) filter (where u.id is not null) as registered,
    count(*) filter (where u.email_confirmed_at is not null) as confirmed,
    count(*) filter (where
      ad.role = 'owner'
      and ai.tier = 'royal_ai'
      and ai.signup_bonus_remaining >= 10000
      and exists (
      select 1 from public.user_entitlements e
      where e.user_id = u.id and e.entitlement_key = 'all_access' and e.revoked_at is null
      )
    ) as ready
  from public.internal_account_allowlist a
  left join auth.users u on lower(u.email) = a.email
  left join public.app_admins ad on ad.user_id = u.id and ad.active
  left join public.ai_usage_accounts ai on ai.user_id = u.id
  where a.role = 'owner'
), function_security as (
  select count(*) filter (
    where has_function_privilege('anon', p.oid, 'EXECUTE')
       or has_function_privilege('authenticated', p.oid, 'EXECUTE')
       or not has_function_privilege('service_role', p.oid, 'EXECUTE')
  ) as failures
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
  where p.proname in ('admin_get_context', 'admin_find_user', 'admin_grant_benefit', 'admin_list_benefit_grants')
)
select '관리자 테이블 RLS' as check_name,
  case when failures = 0 then 'PASS' else 'FAIL' end as status,
  concat('문제 테이블 ', failures, '개') as details
from rls_check
union all
select '관리자 RPC 권한',
  case when failures = 0 then 'PASS' else 'FAIL' end,
  concat('잘못된 권한 ', failures, '개')
from function_security
union all
select '소유자 계정',
  case
    when allowlisted = 0 then 'PENDING'
    when ready = allowlisted then 'PASS'
    when registered < allowlisted or confirmed < allowlisted then 'PENDING'
    else 'FAIL'
  end,
  case
    when allowlisted = 0 then 'provision_internal_account 실행 필요'
    else concat('allowlisted=', allowlisted, ', registered=', registered, ', confirmed=', confirmed, ', ready=', ready)
  end
from owner_state;
