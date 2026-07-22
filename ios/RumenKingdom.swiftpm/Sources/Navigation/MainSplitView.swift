import SwiftUI

/// iPad layout: all eight sections in one sidebar, since a split view has
/// room that a phone tab bar doesn't. Phase 6 step 8 (반응형) revisits the
/// exact column widths once real content exists.
struct MainSplitView: View {
    @State private var selection: AppSection? = .lobby

    var body: some View {
        NavigationSplitView {
            List(AppSection.allCases, selection: $selection) { section in
                Label(section.label, systemImage: section.systemImage)
                    .tag(section)
            }
            .navigationTitle("루멘왕국")
        } detail: {
            NavigationStack {
                sectionScreen(for: selection ?? .lobby)
            }
        }
    }
}
