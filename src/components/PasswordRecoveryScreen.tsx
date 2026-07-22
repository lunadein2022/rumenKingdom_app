import { useState } from 'react'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function PasswordRecoveryScreen({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (password.length < 8) return setMessage('비밀번호는 8자 이상 입력해 주세요.')
    if (password !== confirmation) return setMessage('비밀번호 확인이 일치하지 않아요.')
    if (!supabase) return setMessage('계정 서버에 연결할 수 없습니다.')
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) return setMessage(error.message)
    setMessage('새 비밀번호로 변경했어요.')
    window.setTimeout(onComplete, 700)
  }
  return <div className="login-shell recovery-shell"><main className="login-card glass-panel"><span className="eyebrow">PASSWORD RECOVERY</span><h1>새 비밀번호 정하기</h1><p>앞으로 왕국에 입장할 새 비밀번호를 입력해 주세요.</p><label>새 비밀번호<div className="login-input"><LockKeyhole size={16}/><input autoFocus type={visible ? 'text' : 'password'} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)}/><button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}>{visible ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></label><label>비밀번호 확인<div className="login-input"><LockKeyhole size={16}/><input type={visible ? 'text' : 'password'} minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void save()}/></div></label>{message && <div className="login-message" role="status">{message}</div>}<button className="login-submit" disabled={saving} onClick={() => void save()}>{saving ? '변경하는 중…' : '비밀번호 변경'}</button></main></div>
}
