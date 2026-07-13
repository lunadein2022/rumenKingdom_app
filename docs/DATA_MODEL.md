# 데이터 사전

## 공통 규칙

| 항목 | 규칙 |
| --- | --- |
| ID | UUID v4, DB 기본값은 `gen_random_uuid()` |
| 소유자 | 모든 사용자 데이터에 `user_id uuid not null default auth.uid()` |
| 생성/수정 | 감사 시각은 `timestamptz` |
| 시간대 | 기본 `Asia/Seoul` |
| 서비스일 경계 | 현지 시각 오전 6시 |
| 보안 | RLS와 동일 소유자 복합 FK를 함께 적용 |

## 프로젝트와 퀘스트

### `main_quests`

- 프로젝트 원본이다. 퀘스트의 필수 부모가 아니라 선택적 연결 대상이다.
- 제목, 목표, 설명, 메모, 태그, 기간, 상태, 우선순위를 저장한다.
- 연결 퀘스트가 있으면 진행률은 완료 비율로 계산하고, 없을 때만 `manual_progress`를 사용한다.

### `quests`

- `kind`로 `daily`와 `sub`를 구분한다.
- `main_quest_id`와 `parent_quest_id`는 nullable이며, 연결이 없으면 독립 퀘스트다.
- `recurrence_rule`은 반복 원본 규칙이다.
- 일회성 퀘스트만 `status = completed`와 `completed_at`을 원본 행에 저장한다.
- 반복 퀘스트 행은 재사용 가능한 템플릿이므로 완료할 때 원본 `completed_at`을 지우거나 덮어쓰지 않는다.

### `quest_completion_logs`

- 반복 퀘스트의 날짜별 완료 이력이다.
- `(user_id, quest_id, occurrence_date)`는 유일하다.
- `occurrence_date`는 사용자 시간대와 오전 6시 서비스일 경계를 적용한 날짜다.
- 완료 취소는 해당 날짜의 로그만 삭제한다. 과거 날짜의 완료 기록은 유지한다.
- `(quest_id, user_id)` 복합 FK로 다른 계정의 퀘스트를 참조할 수 없고, 원본 퀘스트 삭제 시 함께 삭제된다.

## 일정

- `calendar_events`는 시작일·종료일, 시작·종료 시각, 종일 여부, 분류와 RRULE을 저장한다.
- 반복 원본은 `recurrence_rule`, 개별 예외는 `recurrence_exceptions`에 둔다.
- 퀘스트는 사용자가 수행할 행동이고, 일정은 특정 시각 또는 기간에 발생하는 회의·여행·행사다.

## 다이어리

- `diary_entries`는 사용자별 날짜당 한 개를 기본으로 한다.
- `diary_quest_links`는 완료 퀘스트의 제목과 문맥을 스냅샷으로 보존한다.
- 반복 퀘스트는 `quest_completion_logs.occurrence_date`로 해당 날짜 완료 여부를 조회한다.

## 도서관

- 도서관은 별도 원본 테이블이 아니라 프로젝트, 퀘스트, 다이어리, 비망록, 인연록의 통합 projection이다.
- 안정적인 레코드 키는 `{type}:{source_id}` 형식이다.
- 즐겨찾기, 검색, 수정, 삭제는 반드시 원본 레코드에 반영한다.

## 리타와 첨부

- 리타는 구조화된 초안을 만들고 사용자가 확인한 뒤 기존 Repository를 통해 저장한다.
- DB 성공 응답 전에 저장 완료라고 답하지 않는다.
- 문서·음성은 비망록, 명함 이미지는 인연록 초안으로 처리한다.
- 원본은 private Storage에 `{user_id}/...` 경로로 저장하고 `attachments`에 메타데이터를 둔다.

## 설정·알림·내보내기

- `user_settings`: 프로필, 알림, 리타 응답 방식, 시간대, 서비스일 설정. 비밀키는 저장하지 않는다.
- `room_backgrounds`: 방별 private Storage 경로.
- 현재 인앱 알림은 앱 실행 중 계산하며 OS 푸시와 백그라운드 스케줄러는 별도 서버 작업이다.
- JSON 백업은 `format`, `version`, `exportedAt`, `data`를 포함하고 현재 인증 사용자의 데이터만 다룬다.

## Repository 경계

UI는 Supabase를 직접 호출하지 않는다. 프로젝트, 퀘스트, 반복 완료, 일정, 다이어리, 비망록, 인연록, 첨부, 설정 Repository를 통해 접근한다. Supabase RLS가 최종 보안 경계이며 프런트 필터는 보안 수단으로 간주하지 않는다.
