# 4단계 공통 업데이트 시스템 · 5단계 기준 웹

## 서버에서 즉시 변경되는 항목

- `app_runtime_config`: API 버전, 최소 버전, 강제 업데이트, 점검, 기능 플래그, AI 포인트, 요금제
- `app_announcements`: 공지·점검·이벤트 안내와 게시 기간
- `app_catalog_items`: 테마·위젯 상품 목록과 표시 가격
- `app_releases`: 공통 패치노트
- `get_public_app_bootstrap`: 웹·iOS·Android가 시작 시 읽는 단일 공개 계약

공개 클라이언트는 읽기만 가능하며 관리자 변경은 `admin-runtime` Netlify 함수에서 세션과 `owner/admin` 역할을 확인한 뒤 수행합니다. 모든 변경은 `app_config_audit_log`에 전후 값과 관리자 ID가 남습니다.

## 반영 시간

- 앱 실행·온라인 복귀: 즉시 재조회
- 앱이 계속 열려 있을 때: 최대 5분
- AI 요청 가격: 서버 함수 캐시로 최대 30초
- 오프라인: 마지막 정상 설정을 사용하고 연결 복구 시 갱신

## 웹 기준 화면

- `/plans`: Free·Royal·Royal AI, 월/연 가격, 14일 체험, AI 포인트 비교
- `/patch-notes`: 공통 패치노트 전체 기록과 서버 API 버전
- `/throne`: 포인트·이용 기록·선물·계정 삭제·요금제 이동
- `/admin`: 운영 설정, 공지, 테마·위젯 카탈로그와 기존 혜택 지급
- `/rita`: 요청 전 예상 포인트와 남은 포인트

## 배포 순서

1. `202607190013_common_update_system.sql` 실행
2. `verify_common_update_system.sql` 실행 후 전체 `PASS` 확인
3. Netlify 배포
4. 관리자 페이지에서 공지 하나를 게시하고 웹·iOS·Android 반영 확인

SwiftUI 화면, Android 네이티브 코드, WidgetKit/App Widget 자체 변경은 여전히 스토어 업데이트가 필요합니다.
