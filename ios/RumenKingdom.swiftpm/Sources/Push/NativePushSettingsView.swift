import SwiftUI

struct NativePushSettingsView: View {
    @AppStorage(NativePushAppDelegate.enabledKey) private var enabled = false
    @State private var working = false
    @State private var message = ""

    var body: some View {
        Toggle("일정과 퀘스트 기기 알림", isOn: Binding(get: { enabled }, set: { value in
            working = true
            Task {
                do { try await NativePushAppDelegate.setEnabled(value); enabled = value; message = value ? "기기 알림을 켰습니다." : "기기 알림을 껐습니다." }
                catch { enabled = false; message = error.localizedDescription }
                working = false
            }
        }))
        .disabled(working)
        if !message.isEmpty { Text(message).font(.footnote).foregroundStyle(.secondary) }
    }
}
