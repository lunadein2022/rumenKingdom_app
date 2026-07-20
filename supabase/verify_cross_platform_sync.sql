-- Read-only post-migration verification for 202607190012_cross_platform_sync.sql.
-- Run the whole file. Supabase SQL Editor will show one summary table.
with
expected_tables(table_name) as (
  values
    ('sync_devices'), ('sync_mutation_receipts'), ('sync_change_log'),
    ('storage_cleanup_queue'), ('store_products'), ('store_transactions'),
    ('user_subscriptions')
),
missing_tables as (
  select expected.table_name
  from expected_tables expected
  where to_regclass('public.' || expected.table_name) is null
),
disabled_rls as (
  select expected.table_name
  from expected_tables expected
  join pg_class relation
    on relation.relnamespace = 'public'::regnamespace and relation.relname = expected.table_name
  where not relation.relrowsecurity
),
expected_revision_tables(table_name) as (
  values
    ('main_quests'), ('quests'), ('calendar_events'), ('diary_entries'),
    ('memos'), ('relationships'), ('relationship_groups')
),
missing_revision_columns as (
  select expected.table_name
  from expected_revision_tables expected
  left join information_schema.columns actual
    on actual.table_schema = 'public'
   and actual.table_name = expected.table_name
   and actual.column_name = 'revision'
  where actual.column_name is null
),
missing_sync_triggers as (
  select expected.table_name || ':' || expected.trigger_suffix as label
  from (
    select table_name, trigger_suffix
    from expected_revision_tables, unnest(array['sync_revision', 'sync_log']) as trigger_suffix
  ) expected
  left join pg_trigger trig
    on trig.tgname = expected.table_name || '_' || expected.trigger_suffix
   and trig.tgrelid = format('public.%I', expected.table_name)::regclass
  where trig.oid is null
),
expected_functions(signature) as (
  values
    ('public.apply_sync_mutation(uuid,uuid,text,text,text,text,uuid,bigint,jsonb)'),
    ('public.get_sync_changes(bigint,integer)'),
    ('public.record_verified_store_transaction(uuid,text,text,text,text,text,timestamptz,timestamptz,text,jsonb)'),
    ('public.enqueue_removed_storage_object()'),
    ('public.delete_entity_attachments()'),
    ('public.bump_sync_revision()'),
    ('public.log_sync_change()')
),
missing_functions as (
  select expected.signature
  from expected_functions expected
  where to_regprocedure(expected.signature) is null
),
invalid_client_privileges as (
  select label from (
    values
      (
        'apply_sync_mutation은 authenticated 실행 가능',
        not has_function_privilege('authenticated', 'public.apply_sync_mutation(uuid,uuid,text,text,text,text,uuid,bigint,jsonb)'::regprocedure, 'EXECUTE')
      ),
      (
        'get_sync_changes는 authenticated 실행 가능',
        not has_function_privilege('authenticated', 'public.get_sync_changes(bigint,integer)'::regprocedure, 'EXECUTE')
      ),
      (
        'record_verified_store_transaction은 authenticated 실행 불가',
        has_function_privilege('authenticated', 'public.record_verified_store_transaction(uuid,text,text,text,text,text,timestamptz,timestamptz,text,jsonb)'::regprocedure, 'EXECUTE')
      ),
      (
        'record_verified_store_transaction은 service_role 실행 가능',
        not has_function_privilege('service_role', 'public.record_verified_store_transaction(uuid,text,text,text,text,text,timestamptz,timestamptz,text,jsonb)'::regprocedure, 'EXECUTE')
      )
  ) as checks(label, failed)
  where failed
),
insecure_table_reads as (
  select label from (
    values
      ('storage_cleanup_queue는 authenticated 직접 조회 불가', has_table_privilege('authenticated', 'public.storage_cleanup_queue', 'select')),
      ('sync_mutation_receipts는 authenticated 직접 조회 불가', has_table_privilege('authenticated', 'public.sync_mutation_receipts', 'select')),
      ('store_transactions는 anon 조회 불가', has_table_privilege('anon', 'public.store_transactions', 'select')),
      ('user_subscriptions는 anon 조회 불가', has_table_privilege('anon', 'public.user_subscriptions', 'select'))
  ) as checks(label, failed)
  where failed
)
select check_name, status, details
from (
  select 1 as sort_order, '공통 동기화 테이블' as check_name,
    case when count(*) = 0 then 'PASS' else 'FAIL' end as status,
    case when count(*) = 0 then '누락 없음' else string_agg(table_name, ', ') end as details
  from missing_tables

  union all
  select 2, 'RLS 활성화',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    case when count(*) = 0 then '모든 대상 테이블 활성화' else string_agg(table_name, ', ') end
  from disabled_rls

  union all
  select 3, 'revision 컬럼',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    case when count(*) = 0 then '모든 레코드 테이블에 존재' else string_agg(table_name, ', ') end
  from missing_revision_columns

  union all
  select 4, '동기화 트리거',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    case when count(*) = 0 then '모든 레코드 테이블에 존재' else string_agg(label, ', ') end
  from missing_sync_triggers

  union all
  select 5, '동기화·결제 함수',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    case when count(*) = 0 then '필수 RPC 함수 정상' else string_agg(signature, ', ') end
  from missing_functions

  union all
  select 6, '클라이언트 실행 권한',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    case when count(*) = 0 then '동기화 RPC는 authenticated, 결제 반영 RPC는 service_role 전용' else string_agg(label, ', ') end
  from invalid_client_privileges

  union all
  select 7, '민감 테이블 직접 조회 차단',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    case when count(*) = 0 then '큐·영수증·결제 테이블은 RPC로만 접근' else string_agg(label, ', ') end
  from insecure_table_reads
) checks
order by sort_order;
