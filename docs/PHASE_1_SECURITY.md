# Phase 1 AI 보안 강화

## 목표

AI API 키와 포인트 변경 권한을 서버에만 두고, 인증된 사용자도 계측 장부를 조작하거나 무제한 실패 요청을 만들 수 없게 한다.

## 구현

- 사용자 JWT 검증은 Supabase anon 클라이언트로 수행한다.
- 포인트 예약·확정·반환과 속도 제한은 Netlify의 서버 전용 Supabase 클라이언트로 수행한다.
- 기존 `authenticated`용 포인트 변경 RPC 오버로드를 삭제한다.
- 새 변경 RPC와 속도 제한 RPC는 `service_role`만 실행한다.
- 사용자는 `get_my_ai_usage()`를 통해 자신의 합계만 조회한다.
- 원본 IP는 저장하지 않고 HMAC-SHA256 해시만 보관한다.
- Netlify 진입점에서 IP당 분당 60회로 제한해 로그인 전 요청 폭주도 함수 실행 전에 차단한다.
- 사용자 기준 분당 12회, 등급별 일일 40/160/400회 시도 제한을 둔다.
- IP 기준 분당 60회, 일일 2,000회 시도 제한을 둔다.
- 실제 포인트 사용 상한은 별도로 Free/Royal/Royal AI 일일 8/40/100회를 유지한다.
- 실패하거나 잘못된 JSON 요청도 속도 제한 횟수에 포함한다.
- JSON 본문은 6MB, 첨부 원본은 4MB로 제한한다.
- 작업 종류, 응답 스타일, 메시지, 첨부 의도, MIME, 파일명과 Base64 형식을 검증한다.
- 대화는 최근 8개, 메시지당 4,000자로 제한한다.

## 필요한 Netlify 비밀값

```text
SUPABASE_SERVICE_ROLE_KEY=Supabase 서버 전용 service_role 키
AI_RATE_LIMIT_HMAC_SECRET=32자 이상의 무작위 비밀값
```

두 값은 Functions scope에만 설정한다. `VITE_`, 브라우저, Swift, Android, Git 저장소에 넣지 않는다.

## 적용 순서

1. Supabase SQL Editor에서 `202607190007_ai_usage_security_hardening.sql` 전체 실행
2. `verify_canonical_schema.sql` 실행 후 `AI 서버 전용 권한`이 `PASS`인지 확인
3. Netlify에 두 비밀값 추가
4. Netlify 함수 배포
5. 로그인 사용자로 정상 요청, 실패 요청, 포인트 소진, 속도 제한 확인

## 완료 조건

- `authenticated`가 포인트 변경 RPC를 실행할 수 없다.
- `service_role`은 네 개 서버 RPC를 실행할 수 있다.
- 서로 다른 두 사용자의 계정과 장부가 격리된다.
- 잘못된 작업, MIME, JSON, 대용량 본문은 Claude 호출 전에 거부된다.
- 원본 IP, API 키, service role 키와 사용자 대화가 서버 로그에 기록되지 않는다.
- 테스트, lint, 프로덕션 빌드가 통과한다.
