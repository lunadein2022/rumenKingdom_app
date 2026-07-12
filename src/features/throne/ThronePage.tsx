import { Bell, ChevronRight, Cloud, Crown, Database, Image, LogOut, Pencil, Save, Sparkles, UserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { isSupabaseConfigured } from '../../lib/supabase'
import { accountStorageKey } from '../../lib/accountScope'
import { useKingdomStore } from '../../store'
import { defaultPreferences, loadPreferences, removeRoomBackground, savePreferences, uploadRoomBackground, type UserPreferences } from '../../services/settingsRepository'
import type { PageId } from '../../types'

type SettingId = 'profile' | 'background' | 'notifications' | 'ai' | 'data' | null

export function ThronePage({ demoMode = false, onResetDemo = () => undefined, onSignOut }: { demoMode?: boolean; onResetDemo?: () => void; onSignOut: () => Promise<void> }) {
  const store = useKingdomStore()
  const profileNameKey = accountStorageKey('rumen-princess-name')
  const profileIntroKey = accountStorageKey('rumen-princess-intro')
  const notificationsKey = accountStorageKey('rumen-in-app-notifications')
  const ritaStyleKey = accountStorageKey('rumen-rita-style')
  const [setting, setSetting] = useState<SettingId>(null)
  const [name, setName] = useState(() => localStorage.getItem(profileNameKey) || '루멘왕국의 공주')
  const [intro, setIntro] = useState(() => localStorage.getItem(profileIntroKey) || '차분하게 왕국의 하루를 가꾸어 가는 중입니다.')
  const [draftName, setDraftName] = useState(name)
  const [draftIntro, setDraftIntro] = useState(intro)
  const [notifications, setNotifications] = useState(() => localStorage.getItem(notificationsKey) !== 'off')
  const [aiStyle, setAiStyle] = useState(() => localStorage.getItem(ritaStyleKey) || 'concise')
  const [timezone, setTimezone] = useState('Asia/Seoul')
  const [serviceDayStartsAt, setServiceDayStartsAt] = useState('06:00')
  const recordCount = store.projects.length + store.quests.length + store.memos.length + store.relationships.length + store.diaries.length

  useEffect(() => { void loadPreferences().then((saved) => { if (!saved) return; setName(saved.profileName); setDraftName(saved.profileName); setIntro(saved.profileIntro); setDraftIntro(saved.profileIntro); setNotifications(saved.notifications); setAiStyle(saved.aiStyle); setTimezone(saved.timezone); setServiceDayStartsAt(saved.serviceDayStartsAt) }).catch(() => undefined) }, [])
  const persistPreferences = (patch: Partial<UserPreferences>) => savePreferences({ ...defaultPreferences, profileName: name, profileIntro: intro, notifications, aiStyle: aiStyle as UserPreferences['aiStyle'], timezone, serviceDayStartsAt, ...patch })

  const saveProfile = async () => {
    const nextName = draftName.trim() || '루멘왕국의 공주'
    const nextIntro = draftIntro.trim()
    setName(nextName); setIntro(nextIntro)
    localStorage.setItem(profileNameKey, nextName)
    localStorage.setItem(profileIntroKey, nextIntro)
    await persistPreferences({ profileName: nextName, profileIntro: nextIntro, timezone, serviceDayStartsAt }).catch(() => undefined)
    setSetting(null)
  }
  const exportData = () => {
    const data = JSON.stringify({ format: 'rumen-kingdom-backup', version: 1, exportedAt: new Date().toISOString(), data: { projects: store.projects, quests: store.quests, memos: store.memos, relationships: store.relationships, diaries: store.diaries, events: store.events } }, null, 2)
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `rumen-kingdom-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url)
  }
  const importData = async (file?: File) => {
    if (!file) return
    try {
      const backup = JSON.parse(await file.text()) as { format?: string; version?: number; data?: Record<string, unknown[]> }
      if (backup.format !== 'rumen-kingdom-backup' || backup.version !== 1 || !backup.data) throw new Error('지원하지 않는 백업 파일입니다.')
      if (!confirm('백업 기록을 현재 왕국에 추가할까요? 같은 제목의 기록도 별도로 추가됩니다.')) return
      const projectIds = new Map<string, string>()
      for (const item of (backup.data.projects ?? []) as typeof store.projects) { const { id, createdAt, updatedAt, completedAt, ...input } = item; void id; void createdAt; void updatedAt; const saved = await store.addProject({ ...input, completedAt }); if (saved) projectIds.set(item.id, saved) }
      for (const item of (backup.data.quests ?? []) as typeof store.quests) { const { id, createdAt, updatedAt, completedAt, ...input } = item; void id; void createdAt; void updatedAt; void completedAt; await store.addQuest({ ...input, projectId: input.projectId ? projectIds.get(input.projectId) : undefined }) }
      for (const item of (backup.data.memos ?? []) as typeof store.memos) { const { id, createdAt, updatedAt, ...input } = item; void id; void createdAt; void updatedAt; await store.addMemo({ ...input, projectId: input.projectId ? projectIds.get(input.projectId) : undefined }) }
      for (const item of (backup.data.relationships ?? []) as typeof store.relationships) { const { id, createdAt, updatedAt, ...input } = item; void id; void createdAt; void updatedAt; await store.addRelationship(input) }
      for (const item of (backup.data.diaries ?? []) as typeof store.diaries) { const { id, createdAt, updatedAt, ...input } = item; void id; void createdAt; void updatedAt; await store.upsertDiary(input) }
      for (const item of (backup.data.events ?? []) as typeof store.events) { const { id, ...input } = item; void id; await store.addEvent(input) }
      alert('백업 기록을 현재 계정에 추가했습니다.')
    } catch (error) { alert(error instanceof Error ? error.message : '백업 파일을 읽지 못했습니다.') }
  }

  return <div className="kingdom-account">
    <section className="princess-profile-card glass-panel">
      <div className="princess-profile-visual"><img src="/assets/characters/princess-bust.webp" alt="루멘왕국의 공주"/><span><Crown size={17}/></span></div>
      <div className="princess-profile-copy"><span className="eyebrow">MY RUMEN KINGDOM</span><h2>{name}</h2><p>{intro}</p><button onClick={() => setSetting('profile')}><Pencil size={14}/> 프로필 편집</button></div>
      <div className="princess-profile-stats"><AccountStat label="총 메인퀘스트" value={store.projects.length}/><AccountStat label="총 퀘스트" value={store.quests.length}/><AccountStat label="작성한 다이어리" value={store.diaries.length}/><AccountStat label="저장된 기록" value={recordCount}/></div>
    </section>

    <section className="kingdom-status-strip glass-panel"><div><small>진행 중 메인퀘스트</small><b>{store.projects.filter((item) => item.status === 'active').length}</b></div><div><small>완료한 퀘스트</small><b>{store.quests.filter((item) => item.done).length}</b></div><div><small>소중한 인연</small><b>{store.relationships.length}</b></div><div><small>왕국의 비망록</small><b>{store.memos.length}</b></div></section>

    <section className="kingdom-settings panel glass-panel">
      <header><span className="eyebrow">PALACE SETTINGS</span><h2>환경 설정</h2><p>공주님의 왕국과 리타를 원하는 방식으로 관리하세요.</p></header>
      <div className="setting-list">
        <SettingRow icon={UserRound} title="프로필" description="공주 이름과 한 줄 소개" onClick={() => setSetting('profile')}/>
        <SettingRow icon={Image} title="배경 설정" description="페이지별 왕궁 배경과 표시 방식" onClick={() => setSetting('background')}/>
        <SettingRow icon={Bell} title="알림 설정" description="왕국 안에서 일정과 기록 알림 받기" onClick={() => setSetting('notifications')}/>
        <SettingRow icon={Sparkles} title="AI 설정" description="AI 메이드 리타의 답변 방식" onClick={() => setSetting('ai')}/>
        <SettingRow icon={Database} title="데이터 관리" description="왕국 기록 내보내기와 보관" onClick={() => setSetting('data')}/>
      </div>
      {setting && <SettingPanel setting={setting} onClose={() => setSetting(null)}>
        {setting === 'profile' && <div className="setting-form"><label>공주 이름<input value={draftName} onChange={(event) => setDraftName(event.target.value)}/></label><label>한 줄 소개<textarea value={draftIntro} onChange={(event) => setDraftIntro(event.target.value)}/></label><div className="form-row"><label>시간대<select value={timezone} onChange={(event) => setTimezone(event.target.value)}><option value="Asia/Seoul">대한민국 · 서울</option><option value="UTC">UTC</option></select></label><label>하루 시작 시각<input type="time" value={serviceDayStartsAt} onChange={(event) => setServiceDayStartsAt(event.target.value)}/></label></div><button className="primary" onClick={() => void saveProfile()}><Save size={14}/> 저장</button></div>}
        {setting === 'background' && <BackgroundSettings/>}
        {setting === 'notifications' && <label className="setting-toggle"><span><b>앱 내부 알림</b><small>일정과 확인할 기록을 헤더에서 안내합니다.</small></span><input type="checkbox" checked={notifications} onChange={(event) => { const value = event.target.checked; setNotifications(value); localStorage.setItem(notificationsKey, value ? 'on' : 'off'); window.dispatchEvent(new CustomEvent('rumen-notification-setting', { detail: value })); void persistPreferences({ notifications: value }) }}/></label>}
        {setting === 'ai' && <label className="setting-select">리타의 답변 방식<select value={aiStyle} onChange={(event) => { const value = event.target.value as UserPreferences['aiStyle']; setAiStyle(value); localStorage.setItem(ritaStyleKey, value); void persistPreferences({ aiStyle: value }) }}><option value="concise">간결하게</option><option value="warm">다정하게</option><option value="detailed">자세하게</option></select><small>계정에 저장되어 다른 기기에서도 같은 답변 방식을 사용합니다.</small></label>}
        {setting === 'data' && <div className="setting-note"><Database size={20}/><div><b>{demoMode ? '데모 왕국 관리' : '내 왕국 기록 보관'}</b><p>{demoMode ? '수정한 데모 기록을 처음 예시 상태로 되돌릴 수 있습니다.' : '현재 계정의 프로젝트, 퀘스트, 일정, 기록을 버전이 포함된 JSON으로 보관하고 다시 불러올 수 있습니다.'}</p>{demoMode ? <button onClick={() => { if (confirm('데모 왕국을 처음 예시 데이터로 되돌릴까요?')) { onResetDemo(); setSetting(null) } }}>데모 데이터 초기화</button> : <div className="data-actions"><button onClick={exportData}>왕국 기록 내보내기</button><label>백업 기록 가져오기<input type="file" accept="application/json,.json" onChange={(event) => void importData(event.target.files?.[0])}/></label></div>}</div></div>}
      </SettingPanel>}
    </section>

    <section className="kingdom-connections panel glass-panel"><header><span className="eyebrow">CONNECTION</span><h2>연결 상태</h2></header><div className="connection-row"><span><Database size={18}/></span><div><b>계정별 기록 저장소</b><small>각 계정과 게스트 기록을 이 기기에서 분리 보관</small></div><em>분리됨</em></div><div className="connection-row"><span><Sparkles size={18}/></span><div><b>AI 메이드 리타</b><small>계정별 대화, 문서 요약, 명함 정리</small></div><em>로그인 후 확인</em></div><div className="connection-row"><span><Cloud size={18}/></span><div><b>일정 클라우드 동기화</b><small>왕실 일정표를 로그인 계정별로 안전하게 동기화</small></div><em>{isSupabaseConfigured ? '준비됨' : '설정 필요'}</em></div></section>

    <button className="signout-button kingdom-signout" onClick={() => void onSignOut()}><LogOut size={16}/> {demoMode ? '로그인해서 내 왕국 만들기' : '왕국에서 나가기'}</button>
  </div>
}

function AccountStat({ label, value }: { label: string; value: number }) { return <span><b>{value}</b><small>{label}</small></span> }

const roomLabels: Record<PageId, string> = { lobby: '로비', office: '집무실', calendar: '왕실 일정표', library: '왕국 도서관', diary: '공주의 침실', garden: '비밀정원', rita: '리타', throne: '왕좌의 방' }

function BackgroundSettings() {
  const [room, setRoom] = useState<PageId>('lobby')
  const [message, setMessage] = useState('JPG, PNG, WEBP · 최대 10MB')
  const [saving, setSaving] = useState(false)
  const upload = async (file?: File) => {
    if (!file) return
    setSaving(true)
    try {
      const saved = await uploadRoomBackground(room, file)
      window.dispatchEvent(new CustomEvent('rumen-background-updated', { detail: { room, url: saved.url } }))
      setMessage(`${roomLabels[room]} 배경을 저장했어요.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : '배경을 저장하지 못했어요.') }
    finally { setSaving(false) }
  }
  const reset = async () => {
    setSaving(true)
    try { await removeRoomBackground(room); window.dispatchEvent(new CustomEvent('rumen-background-updated', { detail: { room, url: undefined } })); setMessage(`${roomLabels[room]} 기본 배경으로 되돌렸어요.`) }
    catch { setMessage('기본 배경으로 되돌리지 못했어요.') }
    finally { setSaving(false) }
  }
  return <div className="background-setting"><label>공간<select value={room} onChange={(event) => setRoom(event.target.value as PageId)}>{Object.entries(roomLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="background-upload"><Image size={20}/><span>{saving ? '배경을 저장하는 중…' : '새 배경 이미지 선택'}</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={saving} onChange={(event) => void upload(event.target.files?.[0])}/></label><small>{message}</small><button disabled={saving} onClick={() => void reset()}>기본 배경으로 복원</button></div>
}

function SettingRow({ icon: Icon, title, description, onClick }: { icon: typeof UserRound; title: string; description: string; onClick: () => void }) {
  return <button onClick={onClick}><span><Icon size={18}/></span><div><b>{title}</b><small>{description}</small></div><ChevronRight size={16}/></button>
}

function SettingPanel({ setting, onClose, children }: { setting: Exclude<SettingId, null>; onClose: () => void; children: React.ReactNode }) {
  const title = { profile: '프로필', background: '배경 설정', notifications: '알림 설정', ai: 'AI 설정', data: '데이터 관리' }[setting]
  return <div className="setting-panel"><div><h3>{title}</h3><button onClick={onClose} aria-label="설정 닫기"><X size={16}/></button></div>{children}</div>
}
