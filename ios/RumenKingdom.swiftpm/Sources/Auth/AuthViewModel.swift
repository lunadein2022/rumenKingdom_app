import Foundation

/// Mirrors the auth half of `src/App.tsx`: track the current Supabase
/// session, expose sign in / sign up / sign out, and translate raw
/// Supabase errors into the same Korean messages the web app shows.
///
/// Talks to `SupabaseAuthAPI` (plain REST) instead of the `supabase-swift`
/// package, and persists the session via `KeychainStore` instead of the
/// SDK's built-in storage — Swift Playgrounds on iPad can't build the
/// SDK's C-based dependencies. See `docs/PHASE_6_IOS_APP.md`.
@MainActor
final class AuthViewModel: ObservableObject {
    @Published private(set) var session: AuthSession?
    @Published private(set) var isLoading = true
    @Published var errorMessage: String?
    @Published var infoMessage: String?

    private static let sessionKey = "supabase.session"

    var isSignedIn: Bool { session != nil }
    var userId: UUID? { session?.user.id }

    init() {
        Task { await restoreSession() }
    }

    private func restoreSession() async {
        defer { isLoading = false }
        guard let data = KeychainStore.load(forKey: Self.sessionKey),
              let saved = try? JSONDecoder().decode(AuthSession.self, from: data) else {
            return
        }
        // Refresh proactively if the stored access token is expired or
        // close to it, same threshold supabase-swift uses internally.
        if saved.expiresAt.timeIntervalSinceNow > 60 {
            session = saved
        } else {
            await refresh(using: saved.refreshToken)
        }
    }

    private func persist(_ newSession: AuthSession) {
        session = newSession
        if let data = try? JSONEncoder().encode(newSession) {
            KeychainStore.save(data, forKey: Self.sessionKey)
        }
    }

    private func clearSession() {
        session = nil
        KeychainStore.delete(forKey: Self.sessionKey)
    }

    private func refresh(using refreshToken: String) async {
        do {
            let refreshed = try await SupabaseAuthAPI.refresh(refreshToken: refreshToken)
            persist(refreshed)
        } catch {
            clearSession()
        }
    }

    func signIn(email: String, password: String) async {
        errorMessage = nil
        infoMessage = nil
        do {
            let newSession = try await SupabaseAuthAPI.signIn(email: email, password: password)
            persist(newSession)
        } catch {
            errorMessage = Self.friendlyMessage(for: error)
        }
    }

    func signUp(email: String, password: String) async {
        errorMessage = nil
        infoMessage = nil
        do {
            let newSession = try await SupabaseAuthAPI.signUp(email: email, password: password)
            if let newSession {
                persist(newSession)
                infoMessage = "계정이 만들어졌어요. 왕국으로 이동하고 있습니다."
            } else {
                infoMessage = "확인 메일을 보냈어요. 인증 후 왕국에 입장해 주세요."
            }
        } catch {
            errorMessage = Self.friendlyMessage(for: error)
        }
    }

    func resetPassword(email: String) async {
        errorMessage = nil
        infoMessage = nil
        guard !email.trimmingCharacters(in: .whitespaces).isEmpty else {
            errorMessage = "비밀번호를 재설정할 이메일을 먼저 입력해 주세요."
            return
        }
        do {
            try await SupabaseAuthAPI.resetPasswordForEmail(email)
            infoMessage = "비밀번호 재설정 메일을 보냈어요."
        } catch {
            errorMessage = Self.friendlyMessage(for: error)
        }
    }

    func signOut() async {
        if let token = session?.accessToken {
            try? await SupabaseAuthAPI.signOut(accessToken: token)
        }
        clearSession()
    }

    /// Same mapping as `authMessage()` in `src/components/LoginScreen.tsx`,
    /// kept in sync so the two clients read the same way to users.
    private static func friendlyMessage(for error: Error) -> String {
        let raw = error.localizedDescription
        if raw.localizedCaseInsensitiveContains("invalid login credentials") {
            return "이메일 또는 비밀번호가 올바르지 않아요."
        }
        if raw.localizedCaseInsensitiveContains("email not confirmed") {
            return "이메일 인증을 완료한 뒤 로그인해 주세요."
        }
        if raw.localizedCaseInsensitiveContains("user already registered") {
            return "이미 가입된 이메일이에요. 로그인해 주세요."
        }
        if raw.localizedCaseInsensitiveContains("signup") && raw.localizedCaseInsensitiveContains("disabled") {
            return "현재 신규 계정 생성이 허용되지 않았어요."
        }
        return "인증 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요."
    }
}
