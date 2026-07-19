# 모바일 빌드와 테스트

## Android

현재 테스트 설치본은 `mobile-artifacts/RumenKingdom-android-debug.apk`입니다.

1. Android 설정에서 이 파일을 연 앱에 한해 `알 수 없는 앱 설치`를 허용합니다.
2. APK를 설치하고 첫 화면에 운영 중인 `https://...netlify.app` 주소를 입력합니다.
3. 웹과 같은 계정으로 로그인한 뒤 일정 하나를 생성합니다.
4. PC 웹에서 시간이나 제목을 수정하고 Android에서 30초 이내 반영되는지 확인합니다.
5. 비행기 모드에서 새 일정을 만든 뒤 네트워크를 복구해 재동기화를 확인합니다.

이 APK는 Android 디버그 키로 서명된 기기 테스트용입니다. Play Console에는 업로드하지 않습니다. 정식 배포에는 별도의 업로드 키로 서명한 AAB가 필요합니다.

## iPhone/iPad

1. `ios/RumenKingdom.swiftpm`을 iCloud Drive에 복사합니다.
2. iPad Swift Playgrounds에서 패키지를 열고 본인의 Apple Developer Team을 선택합니다.
3. 실행 후 운영 중인 `https://...netlify.app` 주소를 입력합니다.
4. iPhone/iPad 실기기에서 로그인, 일정 생성, 오프라인 복구와 파일 첨부를 확인합니다.
5. 내부 배포는 Swift Playgrounds에서 App Store Connect로 올린 뒤 TestFlight 그룹에 배포합니다.

IPA는 Apple Developer Team, 배포 인증서와 provisioning profile로 서명되어야 합니다. 이 저장소가 있는 Windows 환경에서는 유효한 IPA를 생성할 수 없습니다. Mac의 Xcode 또는 iPad Swift Playgrounds에서 계정 서명을 완료해야 합니다.

## 공통 회귀 테스트

- 웹에서 생성 → Android/iOS에서 수정 → 웹에서 삭제
- 같은 기록을 두 기기에서 동시에 수정했을 때 최신 서버 기록 재로딩
- 시간대와 하루 시작 시각이 세 플랫폼에서 동일한지 확인
- 다른 계정의 일정, 첨부파일, 포인트 이력이 보이지 않는지 확인
- 탈퇴 후 로그인 불가, DB 행과 두 비공개 Storage 경로 삭제 확인
- Apple/Google 테스트 결제는 결제 단계에서 Sandbox/License Tester 계정으로 별도 검증
