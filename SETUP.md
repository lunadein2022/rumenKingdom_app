# Princess OS 앱 - 실제 배포 설정 가이드

디자인 시스템(`index.html`, `styles/`, `assets/` 등)은 전혀 건드리지 않았어요.
실제로 동작하는 앱은 `/app` 폴더에 새로 만들었습니다.

## 1. Supabase 프로젝트 만들기

1. https://supabase.com 에서 새 프로젝트 생성
2. 왼쪽 메뉴 **SQL Editor** 에서 `supabase/schema.sql` 내용을 붙여넣고 실행 (quests 테이블 + 보안 규칙 생성)
3. 왼쪽 메뉴 **Authentication -> Providers** 에서 Email 로그인이 켜져 있는지 확인 (기본값 켜짐)
4. 왼쪽 메뉴 **Project Settings -> API** 에서 `Project URL`과 `anon public` 키를 복사

## 2. 키 입력

`app/scripts/supabase-client.js` 파일을 열어서 아래 두 줄을 본인 값으로 바꿔주세요.

```js
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-KEY";
```

이 anon key는 공개되어도 되는 키예요 (Supabase 구조상 원래 그렇게 설계됨). 실제 보안은 방금 실행한 RLS(행 단위 보안) 규칙이 담당해요.

## 3. Netlify 배포

1. 이 폴더 전체를 GitHub 저장소에 올리기
2. Netlify에서 그 저장소 연결 후 배포 (build 설정 없이 정적 배포, `netlify.toml`에 이미 설정됨)
3. 배포되면 `https://your-site.netlify.app/app/` 로 접속하면 실제 앱이 열려요
4. `https://your-site.netlify.app/` (루트)는 지금처럼 디자인 시스템 프리뷰로 그대로 남아있어요

## 지금 되는 것

- 이메일/비밀번호 회원가입·로그인 (Supabase Auth)
- 로그인 후 실제 Home 화면 (Top App Bar + 세린 말풍선 + 퀘스트 미리보기 + 하단 네비)
- 퀘스트 추가 / 상태 순환(대기→진행중→완료) / 삭제, 전부 Supabase에 실제 저장
- 퀘스트에 보상 등급(EXP)과 마감일 지정 가능
- 레벨/EXP, 연속 완료일(스트릭), 생산성, 보상 대기 — 전부 실제 퀘스트 데이터에서 계산 (숫자 조작 없음)
- 완료한 퀘스트는 "🏆 보상 받기"로 보상 수령 처리
- 오늘 마감인 퀘스트 기준 "오늘의 진행률" 링
- 시간대에 따라 자동 밤/낮 전환
- 실제 이번 주 캘린더 (일정 추가/삭제)

## 스키마가 또 바뀌었어요 - 다시 실행해주세요

`supabase/schema.sql` 전체를 SQL Editor에 다시 붙여넣고 Run 해주세요.
이번엔 퀘스트에 상태(대기/진행중/완료), 보상 EXP, 마감일, 보상수령여부 컬럼이 추가되고,
연속 완료일 계산용 `daily_completions` 테이블이 새로 생겨요. 기존 데이터는 자동으로 이관돼요.

(참고: 대화 중에 "Firestore"라고 말씀하신 부분이 있었는데, 지금 이 프로젝트는 Firebase가 아니라
Supabase 기반이에요. 아래 스키마도 전부 Postgres/Supabase SQL이에요.)

## 아직 안 되는 것 (디자인이 없어서)

- 설정 화면 — 하단 네비에서 누르면 "준비 중" 안내만 뜸
- 알림 버튼 — 아직 기능 없음, 아이콘만 있음
