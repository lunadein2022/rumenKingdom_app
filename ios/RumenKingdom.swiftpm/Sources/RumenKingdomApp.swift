import SwiftUI

@main
struct RumenKingdomApp: App {
    @UIApplicationDelegateAdaptor(NativePushAppDelegate.self) private var pushDelegate
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
