import SwiftUI

/// iPhone layout: the six primary sections as tabs (matching the web's
/// top nav), with Rita and the Throne Room reachable from the toolbar —
/// the same split `AppHeader.tsx` uses between `desktop-nav` items and
/// the separate `header-shortcut` links.
struct MainTabView: View {
    @State private var selection: AppSection = .lobby

    private var primarySections: [AppSection] {
        AppSection.allCases.filter(\.isPrimaryTab)
    }

    var body: some View {
        TabView(selection: $selection) {
            ForEach(primarySections) { section in
                NavigationStack {
                    sectionScreen(for: section)
                        .toolbar { toolbarShortcuts }
                        .navigationDestination(for: AppSection.self) { destination in
                            sectionScreen(for: destination)
                        }
                }
                .tabItem { Label(section.label, systemImage: section.systemImage) }
                .tag(section)
            }
        }
    }

    @ToolbarContentBuilder
    private var toolbarShortcuts: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            NavigationLink(value: AppSection.rita) {
                Image(systemName: AppSection.rita.systemImage)
            }
        }
        ToolbarItem(placement: .topBarTrailing) {
            NavigationLink(value: AppSection.throne) {
                Image(systemName: AppSection.throne.systemImage)
            }
        }
    }
}
