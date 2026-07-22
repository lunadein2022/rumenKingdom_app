import SwiftUI

/// Native counterpart of `src/components/LoginScreen.tsx`. No guest/demo
/// mode here — that was a web-only onboarding shortcut and isn't part of
/// the Phase 6 checklist.
struct LoginView: View {
    @EnvironmentObject private var auth: AuthViewModel

    @State private var mode: Mode = .login
    @State private var email = ""
    @State private var password = ""
    @State private var isSubmitting = false

    private enum Mode { case login, signup }

    var body: some View {
        ScrollView {
            VStack(spacing: 22) {
                header

                VStack(alignment: .leading, spacing: 16) {
                    Text(mode == .login ? "다시 오셨군요, 공주님" : "왕국 계정 만들기")
                        .font(.title2.bold())
                    Text(mode == .login ? "오늘의 일정과 퀘스트가 기다리고 있어요." : "루멘왕국에서 공주님의 첫날을 시작해 보세요.")
                        .foregroundStyle(.secondary)

                    labeledField(title: "이메일") {
                        TextField("princess@example.com", text: $email)
                            .textInputAutocapitalization(.never)
                            .keyboardType(.emailAddress)
                            .textContentType(.emailAddress)
                            .autocorrectionDisabled()
                    }

                    labeledField(title: "비밀번호") {
                        SecureField("8자 이상 입력해 주세요", text: $password)
                            .textContentType(mode == .login ? .password : .newPassword)
                    }

                    if mode == .login {
                        Button("비밀번호를 잊으셨나요?") {
                            Task { await auth.resetPassword(email: email) }
                        }
                        .font(.footnote)
                    }

                    if let error = auth.errorMessage {
                        StatusBanner(text: error, tone: .error)
                    }
                    if let info = auth.infoMessage {
                        StatusBanner(text: info, tone: .info)
                    }

                    Button {
                        Task { await submit() }
                    } label: {
                        HStack {
                            if isSubmitting { ProgressView().tint(.white) }
                            Text(isSubmitting ? "왕실 문을 여는 중..." : (mode == .login ? "루멘왕국 입장하기" : "계정 만들기"))
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.purple)
                    .disabled(isSubmitting || email.isEmpty || password.count < 8)

                    Button(mode == .login ? "처음 오셨나요? 왕국 계정 만들기" : "이미 계정이 있나요? 로그인하기") {
                        mode = mode == .login ? .signup : .login
                        auth.errorMessage = nil
                        auth.infoMessage = nil
                    }
                    .font(.footnote)
                    .frame(maxWidth: .infinity)
                }
                .padding(24)
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 18))

                Text("Copyright © RUMEN KINGDOM · All Rights Reserved.")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
            .padding(24)
            .frame(maxWidth: 480)
        }
    }

    private var header: some View {
        VStack(spacing: 6) {
            Image(systemName: "crown.fill")
                .font(.system(size: 44))
                .foregroundStyle(.yellow, .purple)
            Text("PRINCESS OS")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.purple)
            Text("공주님의 하루를 시작할 시간이에요.")
                .foregroundStyle(.secondary)
        }
    }

    @ViewBuilder
    private func labeledField<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.footnote.weight(.semibold))
            content()
                .padding(12)
                .background(.background, in: RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(.separator))
        }
    }

    private func submit() async {
        isSubmitting = true
        defer { isSubmitting = false }
        if mode == .login {
            await auth.signIn(email: email, password: password)
        } else {
            await auth.signUp(email: email, password: password)
        }
    }
}

private struct StatusBanner: View {
    enum Tone { case error, info }
    let text: String
    let tone: Tone

    var body: some View {
        Text(text)
            .font(.footnote)
            .foregroundStyle(tone == .error ? Color.red : Color.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}
