import SwiftUI

/// App root: gates between the loading state, `LoginView` and `MainView`
/// by the shared `AuthViewModel` session, the same role `src/App.tsx`
/// plays on the web (`!authReady` → `!session` → `AppRouter`).
///
/// This replaces the old `WKWebView` shell — the app now talks to
/// Supabase directly instead of embedding the deployed web page. See
/// `docs/PHASE_6_IOS_APP.md` for the full rationale and roadmap.
struct ContentView: View {
    @StateObject private var auth = AuthViewModel()

    var body: some View {
        Group {
            if auth.isLoading {
                ProgressView("왕실 문을 준비하고 있어요...")
            } else if auth.isSignedIn {
                MainView()
            } else {
                LoginView()
            }
        }
        .environmentObject(auth)
        .animation(.default, value: auth.isSignedIn)
    }
}
