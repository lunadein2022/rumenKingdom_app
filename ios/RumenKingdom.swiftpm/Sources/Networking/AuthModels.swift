import Foundation

/// Stand-in for `supabase-swift`'s `User` type, trimmed to the one field
/// `ThroneScreen` actually reads (`session.user.email`).
struct AuthUser: Codable, Sendable {
    let id: UUID
    let email: String?
}

/// Stand-in for `supabase-swift`'s `Session` type. Built locally from the
/// raw GoTrue REST response (`SupabaseAuthAPI`) instead of coming from the
/// SDK.
struct AuthSession: Codable, Sendable {
    let accessToken: String
    let refreshToken: String
    let expiresAt: Date
    let user: AuthUser
}

enum AuthAPIError: LocalizedError {
    case network
    case server(String)

    var errorDescription: String? {
        switch self {
        case .network:
            return "네트워크 연결을 확인해 주세요."
        case .server(let message):
            return message
        }
    }
}
