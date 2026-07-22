import UIKit
import UserNotifications

final class NativePushAppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    static let enabledKey = "rumen.nativePush.enabled"
    private static let tokenKey = "rumen.nativePush.token"

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        if UserDefaults.standard.bool(forKey: Self.enabledKey) { application.registerForRemoteNotifications() }
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        UserDefaults.standard.set(token, forKey: Self.tokenKey)
        Task { await Self.registerWithServer(token: token) }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[NativePush] APNs registration failed: \(error.localizedDescription)")
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound, .badge])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        if let path = response.notification.request.content.userInfo["path"] as? String {
            NotificationCenter.default.post(name: .rumenPushPath, object: path)
        }
        completionHandler()
    }

    static func setEnabled(_ enabled: Bool) async throws {
        UserDefaults.standard.set(enabled, forKey: enabledKey)
        if enabled {
            let granted = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])
            guard granted else { throw PushError.permissionDenied }
            await MainActor.run { UIApplication.shared.registerForRemoteNotifications() }
            if let token = UserDefaults.standard.string(forKey: tokenKey) { await registerWithServer(token: token) }
        } else {
            await MainActor.run { UIApplication.shared.unregisterForRemoteNotifications() }
            await disableOnServer()
        }
    }

    private static func disableOnServer() async {
        guard let data = KeychainStore.load(forKey: "supabase.session"),
              let session = try? JSONDecoder().decode(AuthSession.self, from: data) else { return }
        let url = SupabaseConfig.url.appendingPathComponent("rest/v1/rpc/disable_my_native_push_devices")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["p_platform": "ios"])
        _ = try? await URLSession.shared.data(for: request)
    }

    private static func registerWithServer(token: String) async {
        guard let data = KeychainStore.load(forKey: "supabase.session"),
              let session = try? JSONDecoder().decode(AuthSession.self, from: data) else { return }
        let url = SupabaseConfig.url.appendingPathComponent("rest/v1/rpc/register_my_native_push_device")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["p_platform": "ios", "p_token": token, "p_app_version": "1.0.0", "p_locale": Locale.current.identifier])
        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { throw PushError.registrationFailed }
        } catch { print("[NativePush] token upload failed: \(error.localizedDescription)") }
    }
}

enum PushError: LocalizedError, Equatable { case permissionDenied, registrationFailed
    var errorDescription: String? { self == .permissionDenied ? "기기 알림 권한이 필요해요." : "알림 기기를 등록하지 못했어요." }
}

extension Notification.Name { static let rumenPushPath = Notification.Name("rumen.push.path") }
