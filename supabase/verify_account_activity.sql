-- Run after 202607190009_account_activity_notifications.sql.
with rpc_security as (
  select
    has_function_privilege('authenticated', to_regprocedure('public.get_my_ai_activity(integer)'), 'EXECUTE') as authenticated_ok,
    has_function_privilege('anon', to_regprocedure('public.get_my_ai_activity(integer)'), 'EXECUTE') as anon_has_access
), notification_security as (
  select
    has_table_privilege('authenticated', 'public.notifications', 'SELECT') as can_select,
    has_table_privilege('authenticated', 'public.notifications', 'UPDATE') as can_update,
    has_table_privilege('authenticated', 'public.notifications', 'INSERT') as can_insert,
    has_table_privilege('authenticated', 'public.notifications', 'DELETE') as can_delete
), trigger_state as (
  select exists (
    select 1 from pg_trigger
    where tgname = 'notify_admin_benefit_grant_after_insert' and not tgisinternal
  ) as installed
), policy_state as (
  select count(*) filter (where policyname in ('notifications_select_own', 'notifications_update_own')) as installed
  from pg_policies
  where schemaname = 'public' and tablename = 'notifications'
)
select '내 이용기록 RPC' as check_name,
  case when authenticated_ok and not anon_has_access then 'PASS' else 'FAIL' end as status,
  concat('authenticated=', authenticated_ok, ', anon=', anon_has_access) as details
from rpc_security
union all
select '알림 테이블 권한',
  case when can_select and can_update and not can_insert and not can_delete then 'PASS' else 'FAIL' end,
  concat('select=', can_select, ', update=', can_update, ', insert=', can_insert, ', delete=', can_delete)
from notification_security
union all
select '선물 알림 트리거', case when installed then 'PASS' else 'FAIL' end,
  concat('installed=', installed)
from trigger_state
union all
select '계정별 알림 RLS 정책', case when installed = 2 then 'PASS' else 'FAIL' end,
  concat('installed=', installed, '/2')
from policy_state;
