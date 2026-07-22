# Phase 7 Android 네이티브 앱

## 목표

지금 `android/`는 Capacitor `BridgeActivity`가 `dist` 웹 번들을 감싼 웹뷰 앱이다. 이 문서는 Kotlin + Jetpack Compose로 된 진짜 네이티브 앱을 새로 만드는 계획이다. [PHASE_6_IOS_APP.md](./PHASE_6_IOS_APP.md)와 아키텍처를 최대한 맞춰서, 두 플랫폼이 같은 Supabase 계약·같은 화면 구조·같은 용어를 쓰게 한다.

Capacitor 웹뷰 빌드는 네이티브 전환이 끝나기 전까지 임시로 계속 써도 되지만, 이 문서가 다루는 건 그것을 대체할 새 네이티브 모듈이다. 기존 `android/` 프로젝트를 점진적으로 고치기보다, 별도 Gradle 모듈(예: `androidApp/`)로 새로 시작하는 걸 권장한다 — 웹뷰 기반 프로젝트 구조에 Compose를 억지로 얹으면 나중에 정리 비용이 더 크다.

## 기술 스택

- 언어: Kotlin, Jetpack Compose (Material 3)
- 최소 SDK: 26 (Android 8.0) — Galaxy Tab 등 태블릿 지원 포함
- Supabase: [`supabase-kt`](https://github.com/supabase-community/supabase-kt)의 Auth(GoTrue) + Postgrest 모듈
- 로컬 저장소: Room
- 네트워킹(리타 AI): Ktor client 또는 Retrofit으로 Netlify Function 직접 호출
- 백그라운드 동기화: WorkManager + `ConnectivityManager`

## 클라이언트 환경값

`local.properties` 또는 `BuildConfig` 필드에 다음 두 값만 넣는다.

```kotlin
object SupabaseConfig {
    const val URL = "https://YOUR_PROJECT.supabase.co"
    const val ANON_KEY = "YOUR_SUPABASE_ANON_KEY"
}
```

`SUPABASE_SERVICE_ROLE_KEY`나 Claude API 키는 앱 코드·Git에 절대 넣지 않는다. Rita AI는 항상 Netlify Function을 거친다 — iOS 문서의 계약과 완전히 동일하다.

## 공통 계약 (iOS와 동일 — 다시 설계하지 않음)

| 기능 | 호출 방식 |
| --- | --- |
| 로그인 | `supabase-kt` Auth, Google 로그인은 Credential Manager / One Tap |
| CRUD | `apply_sync_mutation` RPC, `p_platform = "android"` |
| 원격 변경 수신 | `get_sync_changes(p_after_id, p_limit)` 커서 폴링 |
| 앱 설정 | `get_public_app_bootstrap(p_platform = "android")` |
| 리타 AI | `POST /.netlify/functions/claude`, `Authorization: Bearer <supabase access token>` |
| AI 포인트 조회 | `get_my_ai_usage()` |
| 계정 탈퇴 | `POST /.netlify/functions/delete-account` |

세부 필드·재시도 규칙은 웹 `src/lib/syncEngine.ts`, 요청 스키마는 `netlify/functions/ai-policy.js`가 기준 구현이다. iOS와 Android가 각자 다르게 구현하지 말고 이 두 파일을 그대로 포팅하는 것을 원칙으로 한다.

## 로컬 데이터 모델 (Room)

웹 `src/types.ts`의 canonical 필드를 Room Entity로 옮기고, iOS와 동일하게 두 가지를 추가한다.

- 모든 엔티티에 `revision: Long`
- `PendingMutation` 엔티티 — 오프라인 큐(`deviceId`, `mutationId`, `entityType`, `operation`, `recordId`, `expectedRevision`, `payloadJson`, `createdAt`)

동기화는 WorkManager의 주기 작업 + `ConnectivityManager` 콜백으로: 큐 flush → `get_sync_changes` 커서 반영, 웹의 30초 폴링 주기를 그대로 따른다.

## 단계별 구현 (1~10)

1. **Compose 앱 뼈대** — Navigation Compose로 로비·집무실·일정표·도서관·다이어리·비밀정원·리타·왕좌의 방 8개 화면 라우트 구성(`src/app/navigation.ts` 기준). 휴대폰은 `NavigationBar`, 태블릿은 `NavigationRail`/`ListDetailPaneScaffold`.
2. **Supabase 로그인** — 이메일/비밀번호 + Google, 세션은 EncryptedSharedPreferences 또는 DataStore에 보관.
3. **웹·iOS와 같은 데이터 모델** — Room Entity를 canonical 필드와 1:1로 맞춘다. 필드명은 서버 컬럼명(snake_case)이 아니라 웹 타입(camelCase)과 매핑 테이블을 하나 두고 관리하면 나중에 필드 추가할 때 실수가 준다.
4. **일정·퀘스트·일기·메모** — 목록/상세 Composable + `apply_sync_mutation` 연동.
5. **리타 AI** — 대화 UI, 첨부 분석은 `MAX_ATTACHMENT_BYTES`(4MB) 초과 시 클라이언트에서 먼저 막아 불필요한 요청을 줄인다.
6. **오프라인 캐시** — Room이 로컬 원본, WorkManager가 재연결 시 큐 flush.
7. **태블릿 화면** — `WindowSizeClass`로 Compact/Medium/Expanded 분기, Galaxy Tab 실기기로 확인.
8. **딥링크** — App Links(`https://<netlify-domain>/...`)로 웹과 동일한 URL 패턴을 앱에서 열리게 한다. `assetlinks.json`을 Netlify `public/`에 배포해야 한다.
9. **알림** — ✅ FCM 토큰 등록, Android 알림 채널, 공통 큐와 발송 함수까지 구현했다. Firebase 앱과 서비스 계정 연결은 [`NATIVE_PUSH_SETUP.md`](NATIVE_PUSH_SETUP.md)를 따른다.
10. **Play Console 내부 테스트** — 서명 키 생성 후 내부 테스트 트랙 업로드. 신규 개인 개발자 계정은 비공개 테스트로 12명·14일 요건을 먼저 충족해야 프로덕션 트랙 공개가 가능하다.

## 이 단계 전에 서버에 필요한 것

iOS 문서와 동일한 두 가지가 Android에도 똑같이 걸린다.

1. **Firebase 운영 인증 필요** — 공통 `native_push_devices`와 FCM HTTP v1 발송 함수는 구현됐다. `google-services.json`과 서비스 계정 JSON을 운영 환경에 연결해야 한다.
2. **Play Billing 영수증 검증 함수 없음** — `record_verified_store_transaction` RPC는 `service_role` 전용이라 앱이 직접 호출 못 한다. Google Play Developer API로 구매를 검증해서 이 RPC를 호출하는 Netlify Function이 아직 없다. Phase 9에서 iOS(StoreKit)와 함께 만든다.

## 완료 조건

- 로그인 후 웹·iOS에서 만든 일정·퀘스트·일기가 그대로 보인다.
- 앱에서 만든 기록이 30초 이내 웹·iOS에도 반영된다.
- 비행기 모드 작성 → 재연결 시 자동 반영, 동시 수정 충돌은 서버 최신본으로 정리된다.
- 휴대폰·Galaxy Tab 양쪽에서 레이아웃이 깨지지 않는다.
- 신규 개인 계정 기준 비공개 테스트 요건(12명·14일)을 인지하고 일정에 반영한다.
