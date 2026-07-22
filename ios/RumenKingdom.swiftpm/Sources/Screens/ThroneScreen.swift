import SwiftUI

/// Minimal stand-in for `src/features/throne/ThronePage.tsx`. Only the
/// account identity + sign-out loop is wired up here so the skeleton is a
/// fully working app; points/history/plan/data-deletion UI comes later
/// alongside the matching Supabase calls.
struct ThroneScreen: View {
    @EnvironmentObject private var auth: AuthViewModel
    @State private var isSigningOut = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(AppSection.throne.eyebrow)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.purple)
                Text("왕좌의 방")
                    .font(.largeTitle.bold())

                if let email = auth.session?.user.email {
                    Label(email, systemImage: "person.crop.circle.fill")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Divider().padding(.vertical, 4)

                NativePushSettingsView()

                Divider().padding(.vertical, 4)

                Text("포인트·이용 기록·요금제·데이터 삭제 화면은 다음 단계에서 연결됩니다.")
                    .font(.footnote)
                    .foregroundStyle(.tertiary)

                Button(role: .destructive) {
                    Task {
                        isSigningOut = true
                        await auth.signOut()
                        isSigningOut = false
                    }
                } label: {
                    HStack {
                        if isSigningOut { ProgressView() }
                        Text("왕국에서 나가기")
                    }
                }
                .buttonStyle(.bordered)
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .navigationTitle("왕좌의 방")
    }
}
