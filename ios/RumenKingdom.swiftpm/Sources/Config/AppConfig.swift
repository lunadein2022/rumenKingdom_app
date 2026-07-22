import Foundation

/// Browser-safe configuration only. `anonKey` is the Supabase publishable
/// anon key — the same value that goes into the web app's
/// `VITE_SUPABASE_ANON_KEY`. It is safe to ship inside the app binary.
///
/// Never put `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, or
/// `AI_RATE_LIMIT_HMAC_SECRET` here. Those stay server-only in Netlify.
enum SupabaseConfig {
    static let url = URL(string: "https://YOUR_PROJECT.supabase.co")!
    static let anonKey = "YOUR_SUPABASE_ANON_KEY"
}

/// The deployed web/Netlify origin. Rita AI, account deletion and other
/// server-only actions are proxied through Netlify Functions here — the
/// app never calls Anthropic or privileged Supabase RPCs directly.
enum NetlifyConfig {
    static let baseURL = URL(string: "https://YOUR_PROJECT.netlify.app")!

    static var claudeFunctionURL: URL {
        baseURL.appendingPathComponent(".netlify/functions/claude")
    }

    static var deleteAccountFunctionURL: URL {
        baseURL.appendingPathComponent(".netlify/functions/delete-account")
    }
}

/// Mirrors `currentAppVersion()` / `currentPlatform()` in
/// `src/services/runtimeConfigService.ts`. Sent as `p_platform` to
/// `get_public_app_bootstrap` and `apply_sync_mutation`.
enum AppPlatform {
    static let name = "ios"
    static let version = "1.0.0"
}
