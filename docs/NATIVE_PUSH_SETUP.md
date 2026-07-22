# APNs·FCM 운영 설정

코드와 데이터베이스 구조는 준비되어 있지만, 실제 기기 푸시는 각 스토어가 발급한 인증 정보가 있어야 작동한다.

## 1. 공통

1. Supabase SQL Editor에서 `supabase/migrations/202607220017_release_hardening.sql`을 실행한다.
2. Netlify에 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`가 설정되어 있는지 확인한다.
3. 배포 후 `/.netlify/functions/ops-health` 응답과 `operational_events` 테이블을 점검한다.

## 2. Android · Firebase Cloud Messaging

1. Firebase Console에서 Android 앱 `com.rumenkingdom.app`을 등록한다.
2. 내려받은 `google-services.json`을 `android/app/google-services.json`에 둔다. 이 파일은 Git에 올리지 않는다.
3. Firebase 프로젝트 설정의 서비스 계정에서 새 비공개 키 JSON을 발급한다.
4. JSON 파일의 전체 내용을 한 줄 문자열로 Netlify 환경 변수 `FIREBASE_SERVICE_ACCOUNT_JSON`에 저장한다.
5. `pnpm mobile:sync` 후 Android Studio 또는 `pnpm android:apk`로 빌드한다.

## 3. iOS · Apple Push Notification service

1. Apple Developer에서 앱 ID의 Push Notifications capability를 활성화한다.
2. Xcode 프로젝트의 Signing & Capabilities에 Push Notifications와 Background Modes의 Remote notifications를 추가한다.
3. APNs Auth Key(`.p8`)를 발급한다.
4. Netlify에 아래 값을 저장한다.

   - `APNS_KEY_ID`: 발급한 키 ID
   - `APNS_TEAM_ID`: Apple Developer Team ID
   - `APNS_BUNDLE_ID`: 앱 Bundle ID
   - `APNS_PRIVATE_KEY`: `.p8` 파일 전체 내용
   - `APNS_ENVIRONMENT`: 개발 빌드는 `sandbox`, TestFlight·App Store는 `production`

5. 실제 iPhone 또는 iPad에서 알림 권한을 켜고 토큰이 `native_push_devices`에 생성되는지 확인한다. APNs는 시뮬레이터가 아니라 실제 기기로 최종 검증한다.

## 4. 필수 점검

- 일정 또는 퀘스트를 만든 뒤 수정하면 기존 미래 알림이 지워지고 새 시간으로 재생성되어야 한다.
- 삭제한 기록의 알림은 남지 않아야 한다.
- 알림을 켜기 전에 생성된 오래된 알림이 한꺼번에 전송되지 않아야 한다.
- 한국 시간대와 자정 전후, 반복 일정, 앱이 종료된 상태를 각각 테스트한다.
- 실패가 5회 누적되거나 만료된 토큰은 비활성화되는지 확인한다.
