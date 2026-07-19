# iPhone/iPad Swift Playgrounds 앱

`RumenKingdom.swiftpm` 폴더를 iCloud Drive로 옮긴 뒤 iPad의 Swift Playgrounds에서 엽니다.

1. Swift Playgrounds의 앱 설정에서 본인의 Apple Developer Team을 선택합니다.
2. 실행 후 현재 운영 중인 `https://...netlify.app` 주소를 한 번 입력합니다.
3. 이후 웹 배포가 끝나면 앱도 같은 화면과 패치노트를 즉시 사용합니다.

이 패키지는 실제 SwiftUI 앱이며 로그인 세션은 앱의 `WKWebView` 데이터 저장소에 보관됩니다. IPA 또는 TestFlight 빌드는 Apple Developer Team, 배포 인증서와 프로비저닝 프로파일로 서명해야 합니다. Windows에서는 Apple 서명 IPA를 만들 수 없으므로 Swift Playgrounds의 **App Store Connect에 업로드** 또는 Mac의 Xcode Archive를 사용합니다.

WidgetKit 위젯은 별도 네이티브 Extension target과 App Group 설정이 필요하므로 첫 컨테이너 앱과 분리해 다음 단계에서 추가합니다.
