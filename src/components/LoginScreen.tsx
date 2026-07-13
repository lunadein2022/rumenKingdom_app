import { useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function LoginScreen({ onGuest, initialMessage = '' }: { onGuest: () => void; initialMessage?: string }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(initialMessage)

  const authMessage = (error: unknown) => {
    const fallback = error instanceof Error ? error.message : '인증 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.'
    if (/invalid login credentials/i.test(fallback)) return '이메일 또는 비밀번호가 올바르지 않아요.'
    if (/email not confirmed/i.test(fallback)) return '이메일 인증을 완료한 뒤 로그인해 주세요.'
    if (/user already registered/i.test(fallback)) return '이미 가입된 이메일이에요. 로그인해 주세요.'
    if (/signup.*disabled|signups not allowed/i.test(fallback)) return '현재 신규 계정 생성이 허용되지 않았어요. Supabase 가입 설정을 확인해 주세요.'
    return fallback
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setMessage('')
    if (!supabase) {
      setMessage('Supabase 환경 변수를 설정하면 왕국 계정으로 로그인할 수 있어요.')
      return
    }

    setLoading(true)
    try {
      const result = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/` } })
      if (result.error) setMessage(authMessage(result.error))
      else if (mode === 'signup' && result.data.session) setMessage('계정이 만들어졌어요. 왕국으로 이동하고 있습니다.')
      else if (mode === 'signup') setMessage('확인 메일을 보냈어요. 인증 후 왕국에 입장해 주세요.')
    } catch (error) {
      setMessage(authMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    if (!supabase) {
      setMessage('Supabase 환경 변수를 먼저 설정해 주세요.')
      return
    }
    setLoading(true)
    setMessage('Google 로그인 화면으로 이동하고 있어요...')
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/` } })
      if (error) setMessage(authMessage(error))
    } catch (error) {
      setMessage(authMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async () => {
    if (!supabase || !email.trim()) { setMessage('비밀번호를 재설정할 이메일을 먼저 입력해 주세요.'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/` })
      setMessage(error ? authMessage(error) : '비밀번호 재설정 메일을 보냈어요.')
    } catch (error) {
      setMessage(authMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-shell">
      <div className="login-brand-side">
        <img className="login-main-logo" src="/assets/brand/main-logo.webp" alt="루멘왕국, 공주의 하루" />
        <div className="login-welcome-copy">
          <span><Sparkles size={14} /> PRINCESS OS</span>
          <p>공주님의 하루를 시작할 시간이에요.</p>
        </div>
        <img className="login-princess" src="/assets/characters/princess-full.webp" alt="루멘왕국의 공주" />
      </div>

      <main className="login-card glass-panel">
        <span className="eyebrow">WELCOME TO RUMEN</span>
        <h1>{mode === 'login' ? '다시 오셨군요, 공주님' : '왕국 계정 만들기'}</h1>
        <p>{mode === 'login' ? '오늘의 일정과 퀘스트가 기다리고 있어요.' : '루멘왕국에서 공주님의 첫날을 시작해 보세요.'}</p>

        <form onSubmit={submit}>
          <label>이메일<div className="login-input"><Mail size={16} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="princess@example.com" required /></div></label>
          <label>비밀번호<div className="login-input"><LockKeyhole size={16} /><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8자 이상 입력해 주세요" minLength={8} required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
          {mode === 'login' && <button type="button" className="forgot-password" onClick={resetPassword}>비밀번호를 잊으셨나요?</button>}
          {message && <div className="login-message" role="status">{message}</div>}
          <button className="login-submit" type="submit" disabled={loading}>{loading ? '왕실 문을 여는 중...' : mode === 'login' ? '루멘왕국 입장하기' : '계정 만들기'}<ArrowRight size={16} /></button>
        </form>

        <div className="login-divider"><span>또는</span></div>
        <button className="google-login" onClick={signInWithGoogle} disabled={loading}><b>G</b> Google 계정으로 계속하기</button>
        <button className="mode-switch" onClick={() => { setMode((value) => value === 'login' ? 'signup' : 'login'); setMessage('') }}>{mode === 'login' ? '처음 오셨나요? 왕국 계정 만들기' : '이미 계정이 있나요? 로그인하기'}</button>
        <button className="guest-entry" onClick={onGuest}>데모 왕국 둘러보기</button>
        <small className="demo-entry-note">로그인 없이 예시 프로젝트와 퀘스트를 체험할 수 있어요.</small>
        <small className="login-copyright">Copyright © RUMEN KINGDOM · All Rights Reserved.</small>
      </main>
    </div>
  )
}
