-- Read-only post-migration verification.
-- Run the whole file. Supabase SQL Editor will show one summary table.
with
expected_columns(table_name, column_name) as (
  values
    ('main_quests', 'id'), ('main_quests', 'user_id'), ('main_quests', 'title'),
    ('main_quests', 'goal'), ('main_quests', 'description'), ('main_quests', 'memo'),
    ('main_quests', 'tags'), ('main_quests', 'manual_progress'),
    ('main_quests', 'starts_on'), ('main_quests', 'due_on'),
    ('main_quests', 'status'), ('main_quests', 'priority'),
    ('main_quests', 'favorite'), ('main_quests', 'completed_at'),
    ('quests', 'id'), ('quests', 'user_id'), ('quests', 'main_quest_id'),
    ('quests', 'parent_quest_id'), ('quests', 'kind'), ('quests', 'title'),
    ('quests', 'description'), ('quests', 'memo'), ('quests', 'tags'),
    ('quests', 'status'), ('quests', 'priority'), ('quests', 'scheduled_on'),
    ('quests', 'due_on'), ('quests', 'due_at'), ('quests', 'favorite'),
    ('quests', 'completed_at'),
    ('quest_completion_logs', 'quest_id'),
    ('quest_completion_logs', 'occurrence_date'),
    ('quest_completion_logs', 'completed_at'),
    ('calendar_events', 'event_date'), ('calendar_events', 'end_date'),
    ('calendar_events', 'starts_at'), ('calendar_events', 'ends_at'),
    ('calendar_events', 'all_day'), ('calendar_events', 'kind'),
    ('diary_entries', 'entry_date'), ('diary_entries', 'title'),
    ('diary_entries', 'body'), ('diary_entries', 'mood'),
    ('diary_entries', 'favorite'), ('diary_entries', 'tags'),
    ('memos', 'title'), ('memos', 'content'), ('memos', 'status'),
    ('memos', 'source'), ('memos', 'tags'), ('memos', 'favorite'),
    ('relationships', 'name'), ('relationships', 'relationship_type'),
    ('relationships', 'notes'), ('relationships', 'tags'),
    ('relationships', 'organization'), ('relationships', 'favorite'),
    ('relationship_groups', 'user_id'), ('relationship_groups', 'name'),
    ('relationship_groups', 'color'), ('relationship_groups', 'sort_order'),
    ('relationship_group_members', 'user_id'), ('relationship_group_members', 'group_id'),
    ('relationship_group_members', 'relationship_id'),
    ('diary_quest_links', 'diary_id'), ('diary_quest_links', 'source_quest_id'),
    ('diary_quest_links', 'snapshot_title'), ('diary_quest_links', 'snapshot_note'),
    ('attachments', 'entity_type'), ('attachments', 'entity_id'),
    ('attachments', 'storage_path'), ('attachments', 'file_name'),
    ('user_settings', 'preferences'),
    ('room_backgrounds', 'room_key'), ('room_backgrounds', 'storage_path'),
    ('ai_usage_accounts', 'tier'), ('ai_usage_accounts', 'signup_bonus_remaining'),
    ('ai_usage_ledger', 'request_id'), ('ai_usage_ledger', 'points'),
    ('ai_usage_ledger', 'status'), ('ai_usage_ledger', 'estimated_cost_usd'),
    ('ai_rate_limit_events', 'user_id'), ('ai_rate_limit_events', 'ip_hash'),
    ('ai_rate_limit_events', 'occurred_at')
),
missing_columns as (
  select expected.table_name, expected.column_name
  from expected_columns expected
  left join information_schema.columns actual
    on actual.table_schema = 'public'
   and actual.table_name = expected.table_name
   and actual.column_name = expected.column_name
  where actual.column_name is null
),
invalid_project_values as (
  select 'status=' || status::text as value
  from public.main_quests
  where status::text not in ('planned', 'active', 'completed', 'archived')
  union all
  select 'priority=' || priority::text
  from public.main_quests
  where priority::text not in ('low', 'medium', 'high')
),
quest_counts as (
  select
    (select count(*) from public.sub_quests) as legacy_sub,
    (select count(*) from public.daily_quests) as legacy_daily,
    (select count(*) from public.quests where kind::text = 'sub') as canonical_sub,
    (select count(*) from public.quests where kind::text = 'daily') as canonical_daily
),
expected_tables(table_name) as (
  values ('main_quests'), ('quests'), ('calendar_events'), ('diary_entries'),
    ('diary_quest_links'), ('memos'), ('relationships'), ('attachments'),
    ('notifications'), ('reminders'), ('user_settings'), ('room_backgrounds'),
    ('quest_completion_logs'), ('relationship_groups'), ('relationship_group_members'),
    ('ai_usage_accounts'), ('ai_usage_ledger'), ('ai_rate_limit_events')
),
disabled_rls as (
  select expected.table_name
  from expected_tables expected
  left join pg_class relation
    on relation.relnamespace = 'public'::regnamespace and relation.relname = expected.table_name
  where relation.oid is null or not relation.relrowsecurity
),
missing_policies as (
  select expected.table_name
  from expected_tables expected
  left join (
    select tablename, count(*) as policy_count
    from pg_policies where schemaname = 'public' group by tablename
  ) policies on policies.tablename = expected.table_name
  where coalesce(policies.policy_count, 0) = 0
),
duplicate_diaries as (
  select user_id, entry_date
  from public.diary_entries
  group by user_id, entry_date
  having count(*) > 1
),
missing_buckets as (
  select expected.id
  from (values ('rita-attachments'), ('room-backgrounds')) expected(id)
  left join storage.buckets bucket on bucket.id = expected.id
  where bucket.id is null or bucket.public
),
missing_functions as (
  select expected.signature
  from (values
    ('public.save_relationship_with_groups(jsonb,uuid[],jsonb)'),
    ('public.save_diary_with_snapshots(jsonb,jsonb)'),
    ('public.create_memo_with_attachment(jsonb,jsonb)'),
    ('public.check_ai_rate_limit(uuid,text)'),
    ('public.reserve_ai_usage(uuid,uuid,text,integer)'),
    ('public.finalize_ai_usage(uuid,uuid,text,integer,integer,integer,integer,numeric,jsonb)'),
    ('public.release_ai_usage(uuid,uuid,text)'),
    ('public.get_my_ai_usage()')
  ) expected(signature)
  where to_regprocedure(expected.signature) is null
),
insecure_ai_overloads as (
  select signature
  from (values
    ('public.reserve_ai_usage(uuid,text,integer)'),
    ('public.finalize_ai_usage(uuid,text,integer,integer,integer,integer,numeric,jsonb)'),
    ('public.release_ai_usage(uuid,text)')
  ) legacy(signature)
  where to_regprocedure(legacy.signature) is not null
),
invalid_ai_privileges as (
  select signature
  from (values
    ('public.check_ai_rate_limit(uuid,text)'),
    ('public.reserve_ai_usage(uuid,uuid,text,integer)'),
    ('public.finalize_ai_usage(uuid,uuid,text,integer,integer,integer,integer,numeric,jsonb)'),
    ('public.release_ai_usage(uuid,uuid,text)')
  ) protected(signature)
  where has_function_privilege('authenticated', to_regprocedure(protected.signature), 'EXECUTE')
     or not has_function_privilege('service_role', to_regprocedure(protected.signature), 'EXECUTE')
)
select check_name, status, details
from (
  select 1 as sort_order, '필수 컬럼' as check_name,
    case when count(*) = 0 then 'PASS' else 'FAIL' end as status,
    case when count(*) = 0 then '누락 없음'
      else string_agg(table_name || '.' || column_name, ', ' order by table_name, column_name) end as details
  from missing_columns

  union all
  select 2, '프로젝트 상태값',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    case when count(*) = 0 then '모두 정규화됨' else string_agg(distinct value, ', ') end
  from invalid_project_values

  union all
  select 3, '레거시 퀘스트 이관',
    case when canonical_sub >= legacy_sub and canonical_daily >= legacy_daily then 'PASS' else 'FAIL' end,
    format('sub %s/%s, daily %s/%s', canonical_sub, legacy_sub, canonical_daily, legacy_daily)
  from quest_counts

  union all
  select 4, 'RLS 활성화',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    case when count(*) = 0 then '모든 대상 테이블 활성화' else string_agg(table_name, ', ') end
  from disabled_rls

  union all
  select 5, '소유권 정책',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    case when count(*) = 0 then '모든 대상 테이블에 정책 존재' else string_agg(table_name, ', ') end
  from missing_policies

  union all
  select 6, '다이어리 날짜 중복',
    case when count(*) = 0 then 'PASS' else 'CHECK' end,
    case when count(*) = 0 then '중복 없음' else count(*)::text || '개 날짜 확인 필요' end
  from duplicate_diaries

  union all
  select 7, '비공개 Storage',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    case when count(*) = 0 then 'rita-attachments, room-backgrounds 정상' else string_agg(id, ', ') end
  from missing_buckets

  union all
  select 8, '원자 저장 함수',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    case when count(*) = 0 then '필수 RPC 함수 정상' else string_agg(signature, ', ') end
  from missing_functions

  union all
  select 9, 'AI 서버 전용 권한',
    case when (select count(*) from insecure_ai_overloads) = 0 and count(*) = 0 then 'PASS' else 'FAIL' end,
    case when (select count(*) from insecure_ai_overloads) = 0 and count(*) = 0 then '변경 RPC는 service_role 전용'
      else concat('legacy=', (select count(*) from insecure_ai_overloads), ', invalid grants=', count(*)) end
  from invalid_ai_privileges
) checks
order by sort_order;
