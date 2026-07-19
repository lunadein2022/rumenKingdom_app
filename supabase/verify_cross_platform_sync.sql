with required_tables(name) as (
  values
    ('sync_devices'), ('sync_mutation_receipts'), ('sync_change_log'),
    ('storage_cleanup_queue'), ('store_products'), ('store_transactions'),
    ('user_subscriptions')
), revision_tables(name) as (
  values
    ('main_quests'), ('quests'), ('calendar_events'), ('diary_entries'),
    ('memos'), ('relationships'), ('relationship_groups')
), checks as (
  select '공통 동기화 테이블' as check_name,
    case when count(*) = 7 then 'PASS' else 'FAIL' end as status,
    count(*)::text || '/7' as details
  from required_tables required
  where to_regclass('public.' || required.name) is not null
  union all
  select '충돌 감지 revision',
    case when count(*) = 7 then 'PASS' else 'FAIL' end,
    count(*)::text || '/7'
  from revision_tables required
  where exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = required.name
      and column_name = 'revision' and data_type = 'bigint'
  )
  union all
  select '공통 mutation RPC',
    case when to_regprocedure('public.apply_sync_mutation(uuid,uuid,text,text,text,text,uuid,bigint,jsonb)') is not null
      then 'PASS' else 'FAIL' end,
    coalesce(to_regprocedure('public.apply_sync_mutation(uuid,uuid,text,text,text,text,uuid,bigint,jsonb)')::text, '누락')
  union all
  select '변경 피드 RPC',
    case when to_regprocedure('public.get_sync_changes(bigint,integer)') is not null then 'PASS' else 'FAIL' end,
    coalesce(to_regprocedure('public.get_sync_changes(bigint,integer)')::text, '누락')
  union all
  select '결제 기록 서버 전용',
    case when not has_function_privilege(
      'authenticated',
      'public.record_verified_store_transaction(uuid,text,text,text,text,text,timestamp with time zone,timestamp with time zone,text,jsonb)',
      'execute'
    ) then 'PASS' else 'FAIL' end,
    'service_role만 기록 가능'
  union all
  select '정리 큐 클라이언트 차단',
    case when not has_table_privilege('authenticated', 'public.storage_cleanup_queue', 'select')
      and not has_table_privilege('authenticated', 'public.storage_cleanup_queue', 'insert')
      then 'PASS' else 'FAIL' end,
    'service_role 전용'
)
select * from checks order by check_name;

