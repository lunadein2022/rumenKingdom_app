# Phase 2.5 공통 동기화 보강

## 적용 순서

1. Supabase SQL Editor에서 `202607190012_cross_platform_sync.sql` 전체 실행
2. `verify_cross_platform_sync.sql`을 실행하고 모든 결과가 `PASS`인지 확인
3. Netlify를 배포해 `delete-account`, `storage-cleanup` 함수를 반영
4. 웹에서 두 브라우저로 같은 계정에 로그인해 충돌·재동기화를 확인

## 공통 계약

- 모든 주요 레코드는 `revision`을 갖는다.
- 생성·수정·삭제는 `apply_sync_mutation` RPC를 사용한다.
- `device_id + mutation_id`가 같은 요청은 한 번만 적용된다.
- 수정·삭제 시 클라이언트의 `expected_revision`과 서버 revision이 다르면 `conflict`를 반환한다.
- `get_sync_changes`의 정수 cursor로 다른 기기의 생성·수정·삭제를 가져온다.
- 웹은 로컬 outbox에 실패한 mutation을 보관하고 온라인 복귀 시 순서대로 재전송한다.

## 데이터 수명주기

- 첨부 메타데이터가 교체·삭제되면 원본 경로가 `storage_cleanup_queue`에 들어간다.
- Netlify 예약 함수가 매시간 Storage 원본을 삭제한다.
- 사용자 탈퇴는 Storage 두 버킷을 먼저 비운 다음 Auth 사용자를 삭제한다. 사용자 FK 데이터는 cascade 삭제된다.

## 결제 연결

- `store_products`: Apple·Google 상품 ID와 내부 권한 매핑
- `store_transactions`: 서버에서 검증을 마친 거래 원장
- `user_subscriptions`: 공통 계정에 연결된 현재 구독 상태
- `record_verified_store_transaction`: service role 전용 반영 RPC

Apple App Store Server API 또는 Google Play Developer API에서 검증되지 않은 클라이언트 영수증을 이 RPC에 전달하면 안 된다.

