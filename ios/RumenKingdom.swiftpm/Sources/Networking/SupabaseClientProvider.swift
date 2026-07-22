import Foundation
import Security

/// Swift Playgrounds on iPad can't build `supabase-swift`'s C-based
/// transitive targets (`CCryptoBoringSSL`, `CXKCP`), so this app talks to
/// Supabase directly over REST (`SupabaseAuthAPI.swift`) instead of using
/// the SDK. This file used to hold the shared `SupabaseClient`; now it
/// holds the Keychain wrapper that replaces the SDK's session storage.
/// `Security` is a system framework, not an SPM package, so it builds fine
/// even though the SDK's C targets don't. See `docs/PHASE_6_IOS_APP.md`.
enum KeychainStore {
    private static let service = "com.rumenkingdom.app.auth"

    static func save(_ data: Data, forKey key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)

        var attributes = query
        attributes[kSecValueData as String] = data
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(attributes as CFDictionary, nil)
    }

    static func load(forKey key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess else { return nil }
        return result as? Data
    }

    static func delete(forKey key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)
    }
}
