import { FormEvent, useState } from "react";
import { signInWithEmail, signUpWithEmail } from "../../services/supabase/authService";

type Mode = "signin" | "signup";

// 왕궁 톤의 최소 로그인 화면. 이메일/비밀번호로 가입·로그인합니다.
// 로그인에 성공하면 onAuthChange 구독(App)이 세션을 감지해 자동으로 앱으로 넘어갑니다.
export function LoginScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!email.trim() || !password.trim()) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password);
        // 이메일 확인이 켜져 있으면 세션이 바로 생기지 않습니다.
        setNotice("가입되었습니다. 이메일 확인이 필요하면 메일함을 확인한 뒤 로그인해주세요.");
        setMode("signin");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "요청을 처리하지 못했습니다.";
      setError(translateAuthError(message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-scene">
      <div className="login-scene-backdrop" style={{ backgroundImage: 'url("/assets/ballroom.webp")' }} />
      <form className="game-panel login-card" onSubmit={handleSubmit}>
        <div className="login-crest">♛</div>
        <h1>PRINCESS OS</h1>
        <p className="login-sub">공주님, 다시 만나 반가워요.</p>

        <label className="login-field">
          <span>이메일</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="princess@lumen.kingdom"
          />
        </label>

        <label className="login-field">
          <span>비밀번호</span>
          <input
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6자 이상"
          />
        </label>

        {error && <p className="login-error">{error}</p>}
        {notice && <p className="login-notice">{notice}</p>}

        <button type="submit" className="game-button primary login-submit" disabled={busy}>
          {busy ? "잠시만요…" : mode === "signin" ? "로그인" : "가입하기"}
        </button>

        <button
          type="button"
          className="login-switch"
          onClick={() => {
            setMode((m) => (m === "signin" ? "signup" : "signin"));
            setError(null);
            setNotice(null);
          }}
        >
          {mode === "signin" ? "처음이신가요? 가입하기" : "이미 계정이 있으신가요? 로그인"}
        </button>
      </form>
    </div>
  );
}

function translateAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (/user already registered/i.test(message)) return "이미 가입된 이메일입니다. 로그인해주세요.";
  if (/email not confirmed/i.test(message)) return "이메일 확인이 필요합니다. 메일함을 확인해주세요.";
  return message;
}
