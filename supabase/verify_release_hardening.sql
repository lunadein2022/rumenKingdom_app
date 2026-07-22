-- Read-only verification for 202607220017_release_hardening.sql.
with checks as (
  select '알림 교체·취소 RPC' check_name,
    case when to_regprocedure('public.replace_my_reminders(text,uuid,jsonb)') is not null
      and to_regprocedure('public.cancel_my_reminders(text,uuid)') is not null then 'PASS' else 'FAIL' end status,
    '반복 알림 수정·삭제 지원' details
  union all
  select '네이티브 푸시 기기',
    case when to_regclass('public.native_push_devices') is not null
      and to_regprocedure('public.claim_native_push_deliveries(integer)') is not null then 'PASS' else 'FAIL' end,
    'APNs·FCM 등록과 발송 큐'
  union all
  select '서버 페이지네이션',
    case when to_regprocedure('public.get_my_entity_page(text,integer,integer,text)') is not null then 'PASS' else 'FAIL' end,
    '페이지당 최대 20건'
  union all
  select '운영 이벤트',
    case when to_regclass('public.operational_events') is not null then 'PASS' else 'FAIL' end,
    '푸시·스토리지 장애 기록'
  union all
  select '클라이언트 운영 이벤트 차단',
    case when not has_table_privilege('authenticated','public.operational_events','select')
      and not has_table_privilege('authenticated','public.operational_events','insert') then 'PASS' else 'FAIL' end,
    'service_role 전용'
)
select * from checks order by check_name;
