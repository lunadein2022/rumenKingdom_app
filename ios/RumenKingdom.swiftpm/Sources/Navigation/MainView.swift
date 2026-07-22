import SwiftUI

/// Picks the iPhone tab layout vs the iPad split layout by size class,
/// the same `horizontalSizeClass` split described in
/// `docs/PHASE_6_IOS_APP.md`.
struct MainView: View {
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    var body: some View {
        if horizontalSizeClass == .compact {
            MainTabView()
        } else {
            MainSplitView()
        }
    }
}
