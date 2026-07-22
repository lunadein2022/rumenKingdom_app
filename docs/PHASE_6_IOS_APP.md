# Phase 6 iOS·iPadOS 네이티브 앱

## 목표

지금 `ios/RumenKingdom.swiftpm`은 배포된 Netlify 주소를 여는 `WKWebView` 껍데기다. 이 문서는 그것을 [PHASE_2_SHARED_BACKEND.md](./PHASE_2_SHARED_BACKEND.md)·[PHASE_2_5_CROSS_PLATFORM_SYNC.md](./PHASE_2_5_CROSS_PLATFORM_SYNC.md)의 공통 계약을 그대로 쓰는 진짜 SwiftUI 앱으로 바꾸는 계획이다. 데이터 모델과 RPC는 이미 플랫폼 중립적으로 설계돼 있으므로, iOS는 새 백엔드를 만들지 않고 **웹이 쓰는 것과 동일한 Supabase 함수를 Swift에서 직접 호출**한다.

## 기술 스택

- 최소 대상: iOS 17 / iPadOS 17 (SwiftData 사용을 위해)
- 언어: Swift 5.10+, SwiftUI, SwiftData
- Supabase: **SDK(`supabase-swift`) 미사용.** Swift Playgrounds(아이패드)가 그 패키지의 C 기반 타깃(`CCryptoBoringSSL`, `CXKCP`)을 빌드하지 못해서(`C-based target ... not supported`), `URLSession` + `Codable`로 Supabase Auth REST(`/auth/v1/...`)와 PostgREST RPC(`/rest/v1/rpc/<함수명>`)를 직접 호출한다. 자세한 배경은 `ios/README.md`의 "인증 방식" 절 참고.
- 네트워킹: 위 Supabase REST 호출과 리타 AI(Netlify Function 직접 호출) 전부 `URLSession` 하나로 통일.
- 1단계 개발은 Swift Playgrounds(현재 `ios/RumenKingdom.swiftpm` 유지), WidgetKit·StoreKit·서명 단계부터 Xcode로 넘어간다. Mac이 생기면 그때 SDK로 바꿔도 되지만 지금 REST 코드를 버릴 필요는 없다.

## 클라이언트 환경값

Info.plist 또는 `Config.swift`에 다음 두 값만 넣는다. 브라우저 쪽 `.env.example`과 동일하게 **서버 전용 키는 절대 포함하지 않는다.**

```swift
enum SupabaseConfig {
  static let url = URL(string: "https://YOUR_PROJECT.supabase.co")!
  static let anonKey = "YOUR_SUPABASE_ANON_KEY"
}
```

`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `AI_RATE_LIMIT_HMAC_SECRET`은 여전히 Netlify 서버에만 있고 앱 코드에는 절대 넣지 않는다. Rita AI는 항상 Netlify Function을 거친다.

## 공통 계약 재사용 (새로 설계하지 않음)

| 기능 | 호출 방식 |
| --- | --- |
| 로그인 | `POST /auth/v1/token?grant_type=password` (REST 직접 호출, `Sources/Networking/SupabaseAuthAPI.swift`) / Google OAuth는 `ASWebAuthenticationSession` |
| 일정·퀘스트·일기·메모·인연록 CRUD | `POST /rest/v1/rpc/apply_sync_mutation` (device_id + mutation_id로 멱등, expected_revision으로 충돌 감지). 인증 헤더는 `apikey: <anon key>` + `Authorization: Bearer <access token>` |
| 다른 기기 변경분 받아오기 | `POST /rest/v1/rpc/get_sync_changes` (p_after_id, p_limit) 커서 폴링 |
| 앱 실행 시 설정값 | `POST /rest/v1/rpc/get_public_app_bootstrap` (p_platform: "ios") — config/announcements/catalog/releases 한 번에 |
| 리타 AI | `POST https://<netlify-domain>/.netlify/functions/claude`, `Authorization: Bearer <supabase access token>`, body는 `netlify/functions/ai-policy.js`의 `validateAiInput` 스키마와 동일 |
| AI 남은 포인트 조회 | `get_my_ai_usage()` RPC |
| 계정 탈퇴 | `POST /.netlify/functions/delete-account`, body `{ "confirmation": "DELETE MY ACCOUNT" }` |

`apply_sync_mutation`의 `p_entity_type`은 `project | quest | calendar_event | diary | memo | relationship | relationship_group` 중 하나이며, `p_platform`은 `"ios"`로 보낸다. 웹의 `src/lib/syncEngine.ts`가 참고 구현이다 — 필드명·재시도 로직·revision 저장 방식을 그대로 옮기면 된다.

## 로컬 데이터 모델 (SwiftData)

웹의 `src/types.ts` canonical 필드를 그대로 옮기고, 다음 두 개를 추가한다.

- 모든 레코드에 `revision: Int` — 서버 값과 동일하게 유지, 충돌 감지에 사용
- `PendingMutation` 테이블 — 오프라인 중 쌓인 `apply_sync_mutation` 호출을 큐로 저장(`deviceId`, `mutationId`, `entityType`, `operation`, `recordId`, `expectedRevision`, `payloadJSON`, `createdAt`)

동기화 루프는 웹과 동일하게: 실행 시·네트워크 복귀 시 큐를 먼저 flush하고, 그다음 `get_sync_changes` 커서로 원격 변경을 받아 SwiftData에 upsert한다.

## Swift Playgrounds 단계 (1~8)

1. **SwiftUI 앱 뼈대** — `ContentView`의 `WKWebView` 분기를 제거하고 `NavigationSplitView`(iPad) / `TabView`(iPhone) 기반 실제 화면 구조로 교체. 사이드바·탭 구성은 `src/app/navigation.ts`의 7개 화면(로비·집무실·일정표·도서관·다이어리·비밀정원·리타·왕좌의 방)을 그대로 따른다.
2. **Supabase 로그인** — 이메일/비밀번호 + Google 로그인, 세션은 Keychain에 보관(`supabase-swift`가 기본 지원). 로그인 화면은 웹 `LoginScreen.tsx`의 문구·톤을 참고.
3. **일정·퀘스트·일기·메모** — SwiftData 모델 + 목록/상세 뷰, 생성·수정·삭제는 전부 `apply_sync_mutation` 경유.
4. **리타 AI** — 대화 UI, 요청 해석(`interpret-request`)·명함/문서 분석(`analyze-attachment`) 지원. 메시지는 최근 8개·4000자 제한을 클라이언트에서도 미리 자르는 게 안전(서버가 어차피 자르지만 UX상 미리 보여주는 게 좋음).
5. **공통 동기화** — 위 SwiftData 섹션의 outbox + 커서 폴링 구현.
6. **패치노트·기능 플래그** — `get_public_app_bootstrap`을 앱 실행 시·포그라운드 복귀 시 호출하는 `RuntimeConfigStore`(웹의 `RuntimeConfig.tsx`와 동일 역할). `forceUpdate`·`maintenance.blocking`이면 전체 화면 가림막, `featureFlags`로 리타 탭 노출 여부 결정.
7. **오프라인 캐시** — SwiftData가 로컬 원본 역할을 하므로 오프라인에서도 읽기·쓰기 가능. `NWPathMonitor`로 온라인 복귀를 감지해 큐를 flush.
8. **iPhone·iPad 반응형** — `NavigationSplitView`의 2·3단 컬럼을 iPad 가로/세로에서 다르게, iPhone에서는 `TabView`로 단순화. `horizontalSizeClass` 기준 분기.

## Xcode 단계

- **WidgetKit 확장** — Phase 8에서 다룬다. 이 단계에서는 App Groups로 공유할 "브리핑 캐시" JSON 스냅샷을 메인 앱이 매 동기화 후 기록해두면 위젯 작업이 수월해진다.
- **App Groups 공유 저장소** — 위젯·메인 앱이 같은 App Group 컨테이너를 쓰도록 미리 프로비저닝 프로파일에 포함.
- **알림** — ✅ APNs 토큰 등록, 공통 알림 큐와 발송 함수까지 구현했다. Apple capability와 `.p8` 운영 키 적용 및 실제 기기 검증은 [`NATIVE_PUSH_SETUP.md`](NATIVE_PUSH_SETUP.md)를 따른다.
- **딥링크** — Universal Links로 `https://<netlify-domain>/calendar/event/:id` 형태의 웹 URL을 그대로 앱에서 열리게 한다. `apple-app-site-association` 파일을 Netlify `public/`에 두고 배포해야 한다.
- **StoreKit 결제** — Phase 9와 함께 진행. `record_verified_store_transaction` RPC는 `service_role` 전용이라 앱이 직접 호출할 수 없다 — Apple 영수증을 검증해서 이 RPC를 호출해줄 새 Netlify Function이 필요하다(아직 없음, Phase 9에서 함께 설계).
- **TestFlight** — App Store Connect에 앱 등록 후 내부 테스트 그룹 배포.
- **App Store 서명·배포** — Apple Developer Team 인증서·프로비저닝 프로파일로 서명. Windows에서는 불가하며 사용자님 Mac/iPad에서 진행.

## 이 단계 전에 서버에 필요한 것

Swift 코드 작성 자체는 지금 바로 시작할 수 있지만, 다음 두 가지는 iOS 코드만으로는 끝낼 수 없고 Supabase·Netlify 쪽에 새 작업이 필요하다.

1. **푸시 운영 인증 필요** — 공통 `native_push_devices`와 APNs 발송 함수는 구현됐다. Apple Developer의 Push Notifications capability, Bundle ID, `.p8` 키를 운영 환경에 연결해야 한다.
2. **StoreKit 영수증 검증 함수 없음** — `store_products`/`store_transactions`/`user_subscriptions` 테이블과 `record_verified_store_transaction` RPC는 있지만, Apple App Store Server API로 영수증을 검증해서 이 RPC를 호출하는 Netlify Function이 아직 없다. Phase 9에서 Android(Google Play)와 함께 만든다.

## 완료 조건

- 로그인 후 웹에서 만든 일정·퀘스트·일기가 그대로 보인다.
- 앱에서 만든 기록이 30초 이내 웹·Android에도 반영된다.
- 비행기 모드에서 작성 → 재연결 시 자동 반영, 충돌 시 서버 최신본으로 정리된다.
- `get_public_app_bootstrap`이 실패하거나 오프라인이면 마지막으로 받은 설정값으로 동작한다.
- iPhone·iPad 양쪽에서 레이아웃이 깨지지 않는다.
