# iPhone/iPad Swift Playgrounds 앱

이 패키지는 이제 `WKWebView` 껍데기가 아니라 Supabase를 직접 호출하는 실제 SwiftUI 앱입니다. 자세한 아키텍처와 전체 로드맵은 [`docs/PHASE_6_IOS_APP.md`](../docs/PHASE_6_IOS_APP.md)를 참고하세요.

## 처음 실행하기

1. `RumenKingdom.swiftpm` 폴더를 iCloud Drive로 옮긴 뒤 iPad의 Swift Playgrounds(또는 Mac의 Xcode)에서 엽니다.
2. `Sources/Config/AppConfig.swift`를 열어 다음 두 값을 채웁니다.
   - `SupabaseConfig.url` / `SupabaseConfig.anonKey`: 웹의 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`와 동일한 값. `service_role` 키는 절대 넣지 않습니다.
   - `NetlifyConfig.baseURL`: 운영 중인 `https://...netlify.app` 주소. 리타 AI·계정 삭제 요청이 이 주소의 Netlify Function을 거칩니다.
3. Swift Playgrounds 앱 설정에서 본인의 Apple Developer Team을 선택합니다.
4. 실행 후 이메일/비밀번호로 로그인하거나 새 계정을 만듭니다. 웹에서 만든 계정과 같은 이메일로 로그인하면 같은 Supabase 계정을 씁니다.

## 인증 방식 — supabase-swift 패키지를 쓰지 않습니다

Swift Playgrounds(아이패드)는 `supabase-swift`가 의존하는 C 기반 타깃(`CCryptoBoringSSL`, `CXKCP`)을 빌드하지 못합니다. Package.swift에 패키지를 추가하면 "C-based target ... not supported" 에러가 나고, 빼면 `Unable to find module dependency: Supabase`가 나는 구조라 설정으로는 해결이 안 됩니다. 그래서 이 프로젝트는 SDK 없이 Supabase의 GoTrue REST API(`/auth/v1/...`)를 `URLSession` + `Codable`로 직접 호출합니다.

- `Sources/Networking/SupabaseAuthAPI.swift` — 로그인/회원가입/비밀번호 재설정/토큰 갱신/로그아웃을 REST로 직접 호출.
- `Sources/Networking/AuthModels.swift` — `supabase-swift`의 `Session`/`User`를 대신하는 최소 모델.
- `Sources/Networking/SupabaseClientProvider.swift` — 이제 `KeychainStore`(시스템 `Security` 프레임워크 기반 세션 저장)만 담당합니다. `Security`는 SPM 패키지가 아니라 OS 프레임워크라 C 타깃 문제와 무관하게 빌드됩니다.
- 나중에 Mac + Xcode로 넘어가면 SDK를 다시 붙여도 되고, 지금 이대로 REST 방식을 계속 써도 됩니다 — 일정·퀘스트 동기화(Phase 6 3단계 이후)도 어차피 Supabase REST/RPC를 직접 호출하는 방식이라 지금 코드가 버려지지 않습니다.

## 지금 구현된 것 (Phase 6 1~2단계)

- SwiftUI 앱 뼈대: iPhone은 `TabView`(로비·집무실·일정표·도서관·다이어리·비밀정원 + 리타·왕좌의 방 툴바 단축), iPad는 `NavigationSplitView` 사이드바.
- Supabase 이메일/비밀번호 로그인·회원가입·비밀번호 재설정·로그아웃. 세션은 위 REST 방식 + Keychain으로 보관됩니다.
- 나머지 6개 섹션은 아직 자리만 잡아둔 화면(`PlaceholderScreen`)입니다 — Phase 6 3단계부터 SwiftData 데이터 모델과 실제 화면으로 채웁니다.

## 아직 안 된 것

- Google 로그인: `ASWebAuthenticationSession`과 리다이렉트 URL scheme 등록이 필요해서, Info.plist를 더 자유롭게 다룰 수 있는 Xcode 단계로 넘어간 뒤 추가하는 걸 추천합니다.
- 일정·퀘스트·일기·메모·리타 AI·공통 동기화·오프라인 캐시: `docs/PHASE_6_IOS_APP.md`의 3~8단계.
- 푸시 알림: APNs 토큰 등록과 서버 발송 기반은 구현되었습니다. 실제 배포 전 Apple capability와 `.p8` 키를 설정하고 [`docs/NATIVE_PUSH_SETUP.md`](../docs/NATIVE_PUSH_SETUP.md) 절차로 실제 기기 테스트가 필요합니다.
- StoreKit 결제: 영수증 검증용 Netlify Function이 아직 없습니다. Phase 9에서 다룹니다.

## 빌드·서명

IPA 또는 TestFlight 빌드는 Apple Developer Team, 배포 인증서와 프로비저닝 프로파일로 서명해야 합니다. Windows에서는 Apple 서명 IPA를 만들 수 없으므로 Swift Playgrounds의 **App Store Connect에 업로드** 또는 Mac의 Xcode Archive를 사용합니다.

WidgetKit 위젯은 별도 네이티브 Extension target과 App Group 설정이 필요하므로 Phase 8에서 별도로 추가합니다.
