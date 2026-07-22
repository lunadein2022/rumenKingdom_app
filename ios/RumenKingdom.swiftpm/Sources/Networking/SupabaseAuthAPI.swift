import Foundation

/// Calls Supabase's GoTrue auth REST API (`/auth/v1/...`) directly with
/// `URLSession` + `Codable` — the same endpoints the `supabase-swift`
/// package would call under the hood, and the same ones the web app's
/// Supabase client uses. Used instead of the SDK because Swift Playgrounds
/// on iPad can't build the SDK's C-based transitive targets
/// (`CCryptoBoringSSL`, `CXKCP`). See `docs/PHASE_6_IOS_APP.md`.
enum SupabaseAuthAPI {
    private struct RawUser: Decodable {
        let id: UUID
        let email: String?
    }

    private struct TokenResponse: Decodable {
        let accessToken: String
        let refreshToken: String
        let expiresIn: Int
        let user: RawUser

        enum CodingKeys: String, CodingKey {
            case accessToken = "access_token"
            case refreshToken = "refresh_token"
            case expiresIn = "expires_in"
            case user
        }

        func toSession() -> AuthSession {
            AuthSession(
                accessToken: accessToken,
                refreshToken: refreshToken,
                expiresAt: Date().addingTimeInterval(TimeInterval(expiresIn)),
                user: AuthUser(id: user.id, email: user.email)
            )
        }
    }

    /// Signup returns a session only when email confirmation is off (or the
    /// account is already confirmed some other way); otherwise the token
    /// fields come back null and the caller shows a "check your email" message.
    private struct SignUpResponse: Decodable {
        let accessToken: String?
        let refreshToken: String?
        let expiresIn: Int?
        let user: RawUser?

        enum CodingKeys: String, CodingKey {
            case accessToken = "access_token"
            case refreshToken = "refresh_token"
            case expiresIn = "expires_in"
            case user
        }

        func toSession() -> AuthSession? {
            guard let accessToken, let refreshToken, let expiresIn, let user else { return nil }
            return AuthSession(
                accessToken: accessToken,
                refreshToken: refreshToken,
                expiresAt: Date().addingTimeInterval(TimeInterval(expiresIn)),
                user: AuthUser(id: user.id, email: user.email)
            )
        }
    }

    private struct APIErrorBody: Decodable {
        let error: String?
        let errorDescription: String?
        let msg: String?
        let message: String?

        enum CodingKeys: String, CodingKey {
            case error
            case errorDescription = "error_description"
            case msg
            case message
        }
    }

    private static func makeRequest(path: String, queryItems: [URLQueryItem] = []) -> URLRequest {
        let base = SupabaseConfig.url.appendingPathComponent("auth/v1").appendingPathComponent(path)
        var components = URLComponents(url: base, resolvingAgainstBaseURL: false)!
        if !queryItems.isEmpty { components.queryItems = queryItems }
        var request = URLRequest(url: components.url!)
        request.httpMethod = "POST"
        request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        return request
    }

    /// Prints status/URL/raw body for every call. Turn on "콘솔 표시" in
    /// Swift Playgrounds' run panel to see this — it's the fastest way to
    /// tell apart a wrong URL/key, a rejected login, and a response shape
    /// this client doesn't parse yet.
    private static func send(_ request: URLRequest, bodyData: Data? = nil) async throws -> Data {
        var request = request
        if let bodyData { request.httpBody = bodyData }
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            print("[SupabaseAuthAPI] network error calling \(request.url?.absoluteString ?? "?"): \(error)")
            throw AuthAPIError.network
        }
        guard let http = response as? HTTPURLResponse else {
            print("[SupabaseAuthAPI] non-HTTP response from \(request.url?.absoluteString ?? "?")")
            throw AuthAPIError.network
        }
        let bodyText = String(data: data, encoding: .utf8) ?? "<\(data.count) bytes, not utf8>"
        print("[SupabaseAuthAPI] \(http.statusCode) \(request.url?.absoluteString ?? "?") -> \(bodyText)")
        guard (200..<300).contains(http.statusCode) else {
            if let parsed = try? JSONDecoder().decode(APIErrorBody.self, from: data) {
                let message = parsed.errorDescription ?? parsed.msg ?? parsed.message ?? parsed.error
                    ?? "요청을 처리하지 못했어요. (\(http.statusCode))"
                throw AuthAPIError.server(message)
            }
            throw AuthAPIError.server("요청을 처리하지 못했어요. (\(http.statusCode))")
        }
        return data
    }

    private static func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
        do {
            return try JSONDecoder().decode(type, from: data)
        } catch {
            print("[SupabaseAuthAPI] decode error for \(type): \(error)")
            throw AuthAPIError.server("서버 응답을 해석하지 못했어요. 콘솔 로그를 확인해 주세요.")
        }
    }

    static func signIn(email: String, password: String) async throws -> AuthSession {
        struct Body: Encodable { let email: String; let password: String }
        let request = makeRequest(path: "token", queryItems: [URLQueryItem(name: "grant_type", value: "password")])
        let bodyData = try JSONEncoder().encode(Body(email: email, password: password))
        let data = try await send(request, bodyData: bodyData)
        return try decode(TokenResponse.self, from: data).toSession()
    }

    static func signUp(email: String, password: String) async throws -> AuthSession? {
        struct Body: Encodable { let email: String; let password: String }
        let request = makeRequest(path: "signup")
        let bodyData = try JSONEncoder().encode(Body(email: email, password: password))
        let data = try await send(request, bodyData: bodyData)
        return try decode(SignUpResponse.self, from: data).toSession()
    }

    static func resetPasswordForEmail(_ email: String) async throws {
        struct Body: Encodable { let email: String }
        let request = makeRequest(path: "recover")
        let bodyData = try JSONEncoder().encode(Body(email: email))
        _ = try await send(request, bodyData: bodyData)
    }

    static func refresh(refreshToken: String) async throws -> AuthSession {
        struct Body: Encodable {
            let refreshToken: String
            enum CodingKeys: String, CodingKey { case refreshToken = "refresh_token" }
        }
        let request = makeRequest(path: "token", queryItems: [URLQueryItem(name: "grant_type", value: "refresh_token")])
        let bodyData = try JSONEncoder().encode(Body(refreshToken: refreshToken))
        let data = try await send(request, bodyData: bodyData)
        return try decode(TokenResponse.self, from: data).toSession()
    }

    static func signOut(accessToken: String) async throws {
        var request = makeRequest(path: "logout", queryItems: [URLQueryItem(name: "scope", value: "global")])
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        _ = try await send(request)
    }
}
