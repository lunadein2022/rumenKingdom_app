with checks as (
  select '공통 출시정보 테이블' as check_name,
    case when to_regclass('public.app_releases') is not null then 'PASS' else 'FAIL' end as status,
    coalesce(to_regclass('public.app_releases')::text, '누락') as details
  union all
  select '공통 출시정보 RLS',
    case when c.relrowsecurity then 'PASS' else 'FAIL' end,
    case when c.relrowsecurity then '활성화' else '비활성화' end
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'app_releases'
  union all
  select '클라이언트 읽기 전용',
    case when has_table_privilege('anon', 'public.app_releases', 'select')
           and has_table_privilege('authenticated', 'public.app_releases', 'select')
           and not has_table_privilege('authenticated', 'public.app_releases', 'insert')
         then 'PASS' else 'FAIL' end,
    'anon/authenticated SELECT, 변경은 service_role 전용'
  union all
  select '웹·iOS·Android 공통 릴리스',
    case when exists (
      select 1 from public.app_releases
      where is_published and platforms @> array['web', 'ios', 'android']::text[]
    ) then 'PASS' else 'FAIL' end,
    coalesce((select version from public.app_releases where is_published order by published_at desc limit 1), '공개 버전 없음')
)
select * from checks order by check_name;
