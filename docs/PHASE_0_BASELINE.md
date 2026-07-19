# Phase 0 기준선

완료일: 2026-07-19

## 완료 상태

- 광고 없이 일정, 퀘스트, 일기와 웹·iOS·Android 동기화를 무료 제공한다.
- Royal은 월 4,900원 / 연 39,000원, Royal AI는 월 9,900원 / 연 79,000원으로 출시안을 고정한다.
- 무료 체험은 14일이며, 초기 운영안은 Royal 기능과 가입 AI 12포인트를 제공한다.
- AI 포인트는 가입 12점, Free 월 4점, Royal 월 69점, Royal AI 월 288점으로 고정한다.
- 기본 요청은 Haiku, 상세 답변과 첨부 분석은 Sonnet으로 처리한다.
- 첫 위젯 범위는 오늘의 브리핑, 왕국 일정표, 주간 브리핑, 리타 앱 열기, 빠른 AI 질문이다.
- 대형 및 iPad 초대형 위젯은 무료이며 프리미엄 테마와 평생 이용권은 출시 이후 검토한다.

## 구현된 기준선

- `ai_usage_accounts`: 사용자 등급과 가입 보너스 잔액
- `ai_usage_ledger`: 요청별 포인트, 모델, 토큰 및 예상 비용 장부
- 월 포인트와 가입 보너스 분리 차감
- 일일 요청 상한과 동시 요청 잠금
- 성공 시 사용 확정, 실패 시 예약 포인트 반환
- Haiku/Sonnet 요청 라우팅
- 입력·출력 길이 상한 및 Claude 비용 추정
- 웹 클라이언트용 AI 잔여량 조회 함수
- 스키마 확인 SQL과 배포 환경변수 문서

Supabase 운영 프로젝트에는 `202607190006_ai_usage_controls.sql`이 적용되었으며 테이블과 네 개 RPC의 생성 결과를 확인했다.

## 검증 결과

- `pnpm test`: 통과
- `pnpm lint`: 통과
- `pnpm build`: 통과
- `node --check netlify/functions/claude.js`: 통과
- `git diff --check`: 통과

## 배포 잠금

Phase 0의 AI 함수 코드는 운영 Netlify에 배포하지 않는다. 현재 변경 RPC가 `authenticated` 역할에 열려 있어, Phase 1에서 다음 보안을 적용한 뒤 배포한다.

1. 포인트 예약·확정·반환 RPC를 서버 전용 역할로 제한
2. 검증된 JWT의 사용자 ID만 서버가 RPC에 전달
3. 사용자·IP 속도 제한
4. 본문, 파일명, 첨부파일 및 작업 종류 검증
5. 실패 요청 반복과 장부 부풀리기 방지

사용자 클라이언트에는 `get_my_ai_usage()` 조회 권한만 남긴다. `SUPABASE_SERVICE_ROLE_KEY` 또는 Supabase 서버 비밀키는 Netlify 서버 환경에만 저장하며 `VITE_`, Swift, Android, Git 저장소에는 넣지 않는다.

## 다음 단계 진입 조건

Phase 1은 `007_ai_usage_security_hardening.sql`과 Netlify 서버 전용 계측 경로를 구현하는 것으로 시작한다. Phase 1 보안 테스트가 통과하기 전에는 AI 계측 코드를 운영 배포하지 않는다.
