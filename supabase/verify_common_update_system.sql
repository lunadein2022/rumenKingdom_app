-- Read-only post-migration verification. Run the whole file — it also
-- actually invokes get_public_app_bootstrap so a broken function body
-- (e.g. selecting fewer columns than it later orders by) shows as FAIL
-- instead of silently passing the static existence checks below.
create or replace function pg_temp.safe_bootstrap_check(p_platform text)
returns jsonb
language plpgsql
as $$
begin
  return jsonb_build_object('ok', true, 'result', public.get_public_app_bootstrap(p_platform));
exception when others then
  return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

with bootstrap_web as (
  select pg_temp.safe_bootstrap_check('web') as outcome
),
checks as (
  select '공통 업데이트 테이블' check_name,
    case when count(*) = 4 then 'PASS' else 'FAIL' end status,
    count(*)::text || '/4' details
  from (values ('app_runtime_config'),('app_announcements'),('app_catalog_items'),('app_config_audit_log')) expected(name)
  where to_regclass('public.' || expected.name) is not null
  union all
  select '앱 부트스트랩 RPC',
    case when to_regprocedure('public.get_public_app_bootstrap(text)') is not null then 'PASS' else 'FAIL' end,
    coalesce(to_regprocedure('public.get_public_app_bootstrap(text)')::text, '누락')
  union all
  select '앱 부트스트랩 실행 성공',
    case when (select (outcome->>'ok')::boolean from bootstrap_web) then 'PASS' else 'FAIL' end,
    coalesce((select outcome->>'error' from bootstrap_web), 'get_public_app_bootstrap(''web'') 정상 반환')
  union all
  select '공개 설정 읽기',
    case when has_table_privilege('anon','public.app_runtime_config','select')
      and not has_table_privilege('authenticated','public.app_runtime_config','update') then 'PASS' else 'FAIL' end,
    '클라이언트 읽기 전용'
  union all
  select '동적 AI 정책',
    case when pg_get_functiondef('public.reserve_ai_usage(uuid,uuid,text,integer)'::regprocedure) like '%ai_point_policy%'
      then 'PASS' else 'FAIL' end,
    '차감 RPC가 서버 정책 참조'
  union all
  select '관리 감사 로그 차단',
    case when not has_table_privilege('authenticated','public.app_config_audit_log','select') then 'PASS' else 'FAIL' end,
    'service_role 전용'
)
select * from checks order by check_name;
