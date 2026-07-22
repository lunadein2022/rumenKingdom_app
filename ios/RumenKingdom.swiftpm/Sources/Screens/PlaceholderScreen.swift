import SwiftUI

/// Temporary content for sections that Phase 6 steps 3+ will fill in with
/// real SwiftData-backed views (calendar, quests, diary, memos, Rita chat).
/// Keeping every section navigable now makes the skeleton testable end to
/// end in Swift Playgrounds before any data layer exists.
struct PlaceholderScreen: View {
    let section: AppSection

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text(section.eyebrow)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.purple)
                Text(section.label)
                    .font(.largeTitle.bold())
                Text(section.pageDescription)
                    .foregroundStyle(.secondary)

                Divider().padding(.vertical, 8)

                Label("이 화면은 다음 단계에서 Supabase 데이터와 연결됩니다.", systemImage: "hammer.fill")
                    .font(.footnote)
                    .foregroundStyle(.tertiary)
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .navigationTitle(section.label)
    }
}
