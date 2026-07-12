# 데이터 사전

## 공통 규칙

| 항목 | 규칙 |
| --- | --- |
| ID | UUID v4, DB에서는 `gen_random_uuid()` |
| 소유자 | `user_id uuid not null default auth.uid()` |
| 생성/수정 | `created_at`, `updated_at`는 `timestamptz` |
| 삭제 | 사용자 삭제 시 cascade, 프로젝트 삭제 시 연결 퀘스트는 독립 퀘스트로 유지 |
| 시간대 | 프로필 기본값 `Asia/Seoul` |
| 업무일 경계 | 현지 시각 오전 6시 |
| 보안 | RLS + 동일 소유자 복합 FK |

## profiles

- `id`: `auth.users.id`
- `display_name`, `intro`
- `timezone`: IANA timezone
- `service_day_starts_at`: 기본 `06:00`

## main_quests

- 프로젝트의 원본이다.
- `title`, `goal`, `description`, `memo`
- `status`: planned / active / completed / archived
- `priority`: low / medium / high
- `starts_on`, `due_on`, `completed_at`
- `manual_progress`: 연결 퀘스트가 없을 때만 사용 가능한 0~100 값
- 표시 진행률: 연결 퀘스트가 있으면 완료 수 / 전체 수, 없으면 `manual_progress`

## quests

- `kind`: daily / sub
- `main_quest_id`: 선택적 프로젝트 연결
- `parent_quest_id`: 선택적 퀘스트 연결
- `title`, `description`, `memo`
- `status`, `priority`
- `scheduled_on`, `due_on`, `due_at`, `completed_at`
- `recurrence_rule`: RFC 5545 RRULE 문자열을 기준으로 하되 실제 반복 인스턴스 정책 확정 전까지 nullable

`status = completed`와 `completed_at`은 함께 변경되어야 한다. 기존 프런트의 `done`은 DB 컬럼으로 중복 저장하지 않고 `status === 'completed'`에서 계산한다.

## calendar_categories / calendar_events

- 기본 분류도 사용자별 레코드로 제공해 이름과 색상을 변경할 수 있게 한다.
- 일정은 `starts_on`, `ends_on`, `starts_at`, `ends_at`, `all_day`를 가진다.
- `ends_on >= starts_on`이어야 한다.
- 종일 일정은 시각을 화면에 노출하지 않는다.
- 반복 원본은 RRULE을 저장하고 개별 변경은 `recurrence_exceptions`에 저장한다.

## diary_entries / diary_quest_links

- 계정별 하루 한 개의 일기를 기본으로 한다: unique `(user_id, entry_date)`.
- 완료 퀘스트 가져오기는 연결 테이블에 기록한다.
- `snapshot_title`과 선택적 `snapshot_note`로 과거 일기의 문맥을 보존한다.
- 동일 일기에 같은 퀘스트를 두 번 가져올 수 없다.

## memos

- 비망록 원본이다.
- `title`, `content`, `transcript`, `status`, `important`, `favorite`
- `source`: manual / rita / document / audio
- 프로젝트 연결은 선택 사항이다.

## relationships

- 인연록 원본이다.
- 이름, 조직, 직책, 연락처, 주소, 관계 유형, 최초 만남일, 최근 연락일, 메모를 저장한다.
- 명함 원본과 OCR 텍스트는 첨부 메타데이터로 연결한다.

## tags / entity_tags

- 태그 이름은 사용자별로 유일하다.
- `entity_tags`도 `user_id`를 포함하고 태그 소유권을 복합 FK로 확인한다.
- 다형 FK의 실제 원본 존재 여부는 Repository 또는 제한된 RPC에서 검증한다.

## notifications / reminders

- 알림은 `kind`, `title`, `body`, `related_entity_type`, `related_entity_id`, `scheduled_for`, `read_at`을 가진다.
- 관련 엔티티가 삭제돼도 알림 문구는 보존하되 상세 이동은 비활성화한다.
- 브라우저 알림은 현재 범위 밖이며 인앱 알림을 우선한다.

## Rita

- `ai_conversations`: 대화 묶음
- `ai_messages`: 개별 사용자/리타 메시지
- `rita_actions`: 리타가 제안한 CRUD 초안과 확인·실행 결과
- 리타는 DB 성공 응답을 받은 뒤에만 저장 완료라고 답한다.
- 사용자가 확인하지 않은 초안은 원본 테이블에 반영하지 않는다.

## settings / backgrounds / export

- `user_settings`: 알림, 리타 답변 방식 등 JSON 설정. 비밀키는 저장하지 않는다.
- `room_backgrounds`: 방별 활성 Storage 경로 및 표시 설정.
- JSON 내보내기는 별도 영구 테이블이 아니라 현재 세션의 RLS 범위 내 데이터를 조합한다.
- 내보내기 형식은 `format`, `version`, `exportedAt`, `data`를 포함한다.

## Repository 경계

UI는 Supabase를 직접 호출하지 않고 다음 저장소 계약을 사용한다.

- `ProjectRepository`
- `QuestRepository`
- `CalendarRepository`
- `DiaryRepository`
- `MemoRepository`
- `RelationshipRepository`
- `NotificationRepository`
- `SettingsRepository`

초기 구현은 localStorage/Zustand, 운영 구현은 Supabase, 데모는 guest 저장소를 사용할 수 있다.
