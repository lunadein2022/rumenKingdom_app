# 왕실 관리자·혜택 지급

## 소유자 계정

`202607190008_admin_benefits.sql` 적용 후 SQL Editor에서 `provision_internal_account`를 호출해 소유자 이메일을 지정한다. 개인 이메일은 소스코드나 Git 기록에 저장하지 않는다. 이미 가입·인증된 계정에는 즉시 적용되고, 아직 가입하지 않았다면 이후 동일 이메일의 인증이 끝날 때 자동 적용된다.

소유자 계정에는 다음이 지급된다.

- AI 등급 `royal_ai`
- 보너스 AI 포인트 10,000점(기존 잔액이 더 많으면 유지)
- `all_access` 전체 기능 이용권
- `/admin` 왕실 혜택 관리소 접근 권한

외부 AI 비용 보호를 위해 분당·일일 속도 제한은 소유자에게도 유지한다.

## 관리자 지급 기능

- `ai_points`: 사용자의 보너스 포인트 잔액에 즉시 합산
- `cosmetic`: 상품 키에 해당하는 꾸미기 이용권 지급
- `all_access`: 전체 기능 이용권 지급

모든 지급은 `admin_benefit_grants`에 지급자, 수령자, 혜택, 수량, 만료일, 사유와 함께 기록된다. 동일한 `idempotency_key`는 한 번만 처리한다.

관리자 화면은 `/admin`에 있으며 메뉴에는 노출하지 않는다. 브라우저는 사용자 세션만 전송하고, 관리자 여부와 실제 지급은 Netlify 함수와 service role 전용 RPC가 검증한다.

## 적용

1. Supabase SQL Editor에서 `202607190008_admin_benefits.sql` 전체 실행
2. 별도로 `select public.provision_internal_account('본인 이메일', 'owner', true);` 실행
3. `verify_admin_benefits.sql` 실행 후 RLS와 RPC 권한이 `PASS`인지 확인
4. 소유자 이메일 인증이 완료되어 있는지 확인하고 해당 계정에서 다시 로그인
5. `/admin` 접속
6. 본인 이메일 검색 후 `royal_ai`, 10,000점, `all_access` 확인
