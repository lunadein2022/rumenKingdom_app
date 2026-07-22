import SwiftUI

/// Shared mapping from `AppSection` to its screen, used by both the
/// iPhone tab layout and the iPad split view so they never drift apart.
@ViewBuilder
func sectionScreen(for section: AppSection) -> some View {
    switch section {
    case .throne:
        ThroneScreen()
    default:
        PlaceholderScreen(section: section)
    }
}
