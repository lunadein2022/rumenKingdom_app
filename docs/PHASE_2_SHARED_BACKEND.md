# Phase 2 공통 서버 계약

## 목표

웹·iOS·Android가 Supabase의 동일한 사용자 ID, 테이블, RLS 정책과 출시정보를 사용한다. 클라이언트의 로컬 저장소는 화면 복구용 캐시일 뿐이며 로그인 계정의 원본 데이터는 Supabase다.

## 공통 데이터 원본

| 영역 | Supabase 원본 |
| --- | --- |
| 메인퀘스트·프로젝트 | `main_quests` |
| 일일·서브퀘스트 | `quests`, `quest_completion_logs` |
| 왕실 일정표 | `calendar_events` |
| 다이어리 | `diary_entries`, `diary_quest_links` |
| 비망록·첨부 | `memos`, `attachments`, private Storage |
| 인연록·그룹 | `relationships`, `relationship_groups`, `relationship_group_members` |
| 계정 설정·방 배경 | `user_settings`, `room_backgrounds`, private Storage |
| 알림 | `notifications` |
| AI 포인트·사용량 | `ai_usage_accounts`, `ai_usage_ledger`와 서버 전용 RPC |
| 패치노트·최소 지원 버전 | `app_releases` |

## 클라이언트 공통 규칙

- Supabase Auth의 같은 `auth.users.id`를 모든 플랫폼의 계정 ID로 사용한다.
- 사용자가 소유한 행은 `user_id = auth.uid()` RLS를 반드시 통과해야 한다.
- `SUPABASE_SERVICE_ROLE_KEY`, AI 제공자 키와 HMAC 비밀값은 Netlify 서버에만 둔다.
- Swift와 Android에는 Supabase URL과 anon/publishable key만 포함한다.
- PostgreSQL `time` 값은 저장 시 `HH:mm`, 읽을 때도 `HH:mm`으로 정규화한다.
- AI 호출, 관리자 지급과 비용 계측은 공통 서버 함수를 통해서만 실행한다.
- `app_releases`는 세 플랫폼이 공통으로 읽고, 변경은 `service_role`만 수행한다.

## 앱 출시정보 계약

`app_releases`의 주요 필드는 다음과 같다.

- `version`: 표시할 앱/서비스 버전
- `title`, `items`: 공통 패치노트 내용
- `platforms`: `web`, `ios`, `android` 중 적용 대상
- `minimum_versions`: 플랫폼별 최소 지원 버전 JSON
- `force_update`: 강제 업데이트 안내 여부
- `published_at`, `is_published`: 공개 시점과 상태

웹은 이미 최신 공개 행을 읽으며, 테이블이 아직 적용되지 않았거나 네트워크 오류가 나면 번들에 포함된 패치노트를 안전하게 사용한다. iOS·Android도 동일한 필터로 최신 행 하나를 읽는다.

## 완료 확인

1. `202607190011_shared_app_releases.sql` 실행
2. `verify_shared_backend.sql` 결과가 모두 `PASS`
3. 웹에서 최신 공통 패치노트 표시 확인
4. 두 계정에서 일정·퀘스트·알림 데이터가 서로 섞이지 않는지 확인
5. 같은 계정으로 다른 기기에서 수정 후 재접속했을 때 Supabase 원본이 표시되는지 확인
