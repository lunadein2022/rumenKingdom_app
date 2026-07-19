import SwiftUI
import WebKit

private enum ServiceSettings {
    static let key = "rumen-mobile-service-url"

    static var savedURL: URL? {
        guard let value = UserDefaults.standard.string(forKey: key),
              let url = URL(string: value),
              url.scheme == "https" else { return nil }
        return url
    }

    static func normalize(_ value: String) -> URL? {
        guard var components = URLComponents(string: value.trimmingCharacters(in: .whitespacesAndNewlines)),
              components.scheme == "https",
              components.host != nil else { return nil }
        components.path = "/"
        components.query = nil
        components.fragment = nil
        return components.url
    }
}

struct ContentView: View {
    @State private var serviceURL = ServiceSettings.savedURL

    var body: some View {
        Group {
            if let serviceURL {
                ZStack(alignment: .topTrailing) {
                    KingdomWebView(url: serviceURL)
                        .ignoresSafeArea(.container, edges: .bottom)
                    Menu {
                        Button("서버 주소 다시 설정", role: .destructive) {
                            UserDefaults.standard.removeObject(forKey: ServiceSettings.key)
                            self.serviceURL = nil
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle.fill")
                            .font(.title2)
                            .symbolRenderingMode(.palette)
                            .foregroundStyle(.white, Color.purple.opacity(0.85))
                            .padding(12)
                    }
                    .accessibilityLabel("앱 연결 설정")
                }
            } else {
                ServiceSetupView { serviceURL = $0 }
            }
        }
    }
}

private struct ServiceSetupView: View {
    @State private var input = ""
    @State private var message = ""
    let onConnected: (URL) -> Void

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "crown.fill")
                .font(.system(size: 58))
                .foregroundStyle(.yellow, .purple)
            Text("루멘왕국 공주님의 하루")
                .font(.title2.bold())
            Text("처음 한 번만 배포된 Netlify 주소를 연결하면 웹·iPhone·iPad·Android가 같은 최신 화면과 Supabase 데이터를 사용해요.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
            TextField("https://example.netlify.app", text: $input)
                .textInputAutocapitalization(.never)
                .keyboardType(.URL)
                .textContentType(.URL)
                .autocorrectionDisabled()
                .padding(12)
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))
            if !message.isEmpty {
                Text(message).font(.footnote).foregroundStyle(.red)
            }
            Button("왕국에 연결하기") {
                guard let url = ServiceSettings.normalize(input) else {
                    message = "https://로 시작하는 Netlify 주소를 입력해 주세요."
                    return
                }
                UserDefaults.standard.set(url.absoluteString, forKey: ServiceSettings.key)
                onConnected(url)
            }
            .buttonStyle(.borderedProminent)
            .tint(.purple)
        }
        .padding(28)
        .frame(maxWidth: 560)
    }
}

private struct KingdomWebView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        guard webView.url == nil else { return }
        webView.load(URLRequest(url: url))
    }

    func makeCoordinator() -> Coordinator { Coordinator() }

    final class Coordinator: NSObject, WKNavigationDelegate {
        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let destination = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }
            if destination.scheme == "https" || destination.scheme == "about" {
                decisionHandler(.allow)
            } else {
                UIApplication.shared.open(destination)
                decisionHandler(.cancel)
            }
        }
    }
}
