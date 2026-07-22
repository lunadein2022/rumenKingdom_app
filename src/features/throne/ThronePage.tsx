import { Bell, ChevronRight, Cloud, Coins, Crown, Database, Gift, History, Image, LogOut, Pencil, Save, ShieldCheck, Sparkles, UserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { isSupabaseConfigured } from '../../lib/supabase'
import { readAccountStorage, writeAccountStorage } from '../../lib/accountScope'
import { useKingdomStore } from '../../store'
import { defaultPreferences, loadPreferences, removeRoomBackground, savePreferences, uploadRoomBackground, type UserPreferences } from '../../services/settingsRepository'
import type { PageId } from '../../types'
import { PrincessPortrait } from '../../components/PrincessPortrait'
import { Pagination, usePaginatedList } from '../../components/Pagination'
import { DataExportPanel } from './DataExportPanel'
import { getPrincess, princessOptions, readSelectedPrincessId, storeSelectedPrincessId, type PrincessId } from '../../lib/princesses'
import { configureServiceTime } from '../../lib/serviceTime'
import { getRitaActivity, type RitaActivity } from '../../services/ritaService'
import { useRitaUsage } from '../../lib/useRitaUsage'
import { deleteMyAccount } from '../../services/accountService'
import { useRuntimeConfig } from '../runtime/RuntimeConfig'
import { disableWebPush, enableWebPush } from '../../services/pushService'
import { scheduleEventReminders, scheduleQuestReminders } from '../../services/reminderService'

type SettingId = 'profile' | 'background' | 'notifications' | 'ai' | 'data' | null

export function ThronePage({ demoMode = false, isAdmin = false, onResetDemo = () => undefined, onSignOut }: { demoMode?: boolean; isAdmin?: boolean; onResetDemo?: () => void; onSignOut: () => Promise<void> }) {
  const store = useKingdomStore()
  const { config } = useRuntimeConfig()
  const [setting, setSetting] = useState<SettingId>(null)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [name, setName] = useState(() => readAccountStorage('rumen-princess-name') || '루멘왕국의 공주')
  const [intro, setIntro] = useState(() => readAccountStorage('rumen-princess-intro') || '차분하게 왕국의 하루를 가꾸어 가는 중입니다.')
  const [draftName, setDraftName] = useState(name)
  const [draftIntro, setDraftIntro] = useState(intro)
  const [notifications, setNotifications] = useState(() => readAccountStorage('rumen-in-app-notifications') !== 'off')
  const [aiStyle, setAiStyle] = useState(() => readAccountStorage('rumen-rita-style') || 'concise')
  const [timezone, setTimezone] = useState('Asia/Seoul')
  const [serviceDayStartsAt, setServiceDayStartsAt] = useState('06:00')
  const [princessId, setPrincessId] = useState<PrincessId>(() => readSelectedPrincessId())
  const [draftPrincessId, setDraftPrincessId] = useState<PrincessId>(princessId)
  const selectedPrincess = getPrincess(princessId)
  const recordCount = store.projects.length + store.quests.length + store.memos.length + store.relationships.length + store.diaries.length
  const { usage } = useRitaUsage(!demoMode)
  const [activity, setActivity] = useState<RitaActivity>({ usage: [], gifts: [] })
  const [activityError, setActivityError] = useState('')
  const usagePage = usePaginatedList(activity.usage, 'rita-usage')
  const giftPage = usePaginatedList(activity.gifts, 'rita-gifts')

  useEffect(() => { void loadPreferences().then((saved) => { if (!saved) return; const savedPrincessId = storeSelectedPrincessId(saved.selectedPrincessId); setName(saved.profileName); setDraftName(saved.profileName); setIntro(saved.profileIntro); setDraftIntro(saved.profileIntro); setNotifications(saved.notifications); setAiStyle(saved.aiStyle); setTimezone(saved.timezone); setServiceDayStartsAt(saved.serviceDayStartsAt); setPrincessId(savedPrincessId); setDraftPrincessId(savedPrincessId) }).catch(() => undefined) }, [])
  useEffect(() => {
    if (demoMode) return
    const refresh = () => void getRitaActivity().then((value) => { setActivity(value); setActivityError('') }).catch(() => setActivityError('이용 기록을 불러오지 못했습니다.'))
    refresh()
    window.addEventListener('rumen-ai-usage-changed', refresh)
    return () => window.removeEventListener('rumen-ai-usage-changed', refresh)
  }, [demoMode])
  const persistPreferences = (patch: Partial<UserPreferences>) => savePreferences({ ...defaultPreferences, profileName: name, profileIntro: intro, notifications, aiStyle: aiStyle as UserPreferences['aiStyle'], timezone, serviceDayStartsAt, selectedPrincessId: princessId, ...patch })
  const changeNotifications = async (value: boolean) => {
    setNotifications(value)
    writeAccountStorage('rumen-in-app-notifications', value ? 'on' : 'off')
    window.dispatchEvent(new CustomEvent('rumen-notification-setting', { detail: value }))
    await persistPreferences({ notifications: value }).catch(() => undefined)
    if (demoMode) return
    if (value) {
      try { await enableWebPush() }
      catch (error) {
        setNotifications(false)
        writeAccountStorage('rumen-in-app-notifications', 'off')
        window.dispatchEvent(new CustomEvent('rumen-notification-setting', { detail: false }))
        await persistPreferences({ notifications: false }).catch(() => undefined)
        alert(error instanceof Error ? error.message : '푸시 알림을 설정하지 못했어요.')
      }
    } else await disableWebPush().catch(() => undefined)
  }

  const saveProfile = async () => {
    const nextName = draftName.trim() || '루멘왕국의 공주'
    const nextIntro = draftIntro.trim()
    setName(nextName); setIntro(nextIntro); setPrincessId(draftPrincessId)
    writeAccountStorage('rumen-princess-name', nextName)
    writeAccountStorage('rumen-princess-intro', nextIntro)
    storeSelectedPrincessId(draftPrincessId)
    configureServiceTime(timezone, serviceDayStartsAt)
    await persistPreferences({ profileName: nextName, profileIntro: nextIntro, timezone, serviceDayStartsAt, selectedPrincessId: draftPrincessId }).catch(() => undefined)
    if (!demoMode) await Promise.allSettled([
      ...store.events.map((event) => scheduleEventReminders(event)),
      ...store.quests.map((quest) => scheduleQuestReminders(quest, store.questCompletions.filter((item) => item.questId === quest.id).map((item) => item.occurrenceDate))),
    ])
    setSetting(null)
  }
  const deleteAccount = async () => {
    const confirmation = prompt('계정과 모든 기록을 영구 삭제합니다. 계속하려면 DELETE를 입력해 주세요.')
    if (confirmation !== 'DELETE') return
    if (!confirm('첨부파일과 구매 연결 기록까지 삭제됩니다. 이 작업은 되돌릴 수 없습니다. 정말 탈퇴할까요?')) return
    setDeletingAccount(true)
    try { await deleteMyAccount(); await onSignOut() }
    catch (error) { alert(error instanceof Error ? error.message : '계정을 삭제하지 못했습니다.') }
    finally { setDeletingAccount(false) }
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
      <div className="princess-profile-visual"><PrincessPortrait princess={selectedPrincess}/><span><Crown size={17}/></span></div>
      <div className="princess-profile-copy"><span className="eyebrow">MY RUMEN KINGDOM</span><h2>{name}</h2><p>{intro}</p><button onClick={() => setSetting('profile')}><Pencil size={14}/> 프로필 편집</button></div>
      <div className="princess-profile-stats"><AccountStat label="총 메인퀘스트" value={store.projects.length}/><AccountStat label="총 퀘스트" value={store.quests.length}/><AccountStat label="작성한 다이어리" value={store.diaries.length}/><AccountStat label="저장된 기록" value={recordCount}/></div>
    </section>

    <section className="kingdom-status-strip glass-panel"><div><small>진행 중 메인퀘스트</small><b>{store.projects.filter((item) => item.status === 'active').length}</b></div><div><small>완료한 퀘스트</small><b>{store.quests.filter((item) => item.done).length}</b></div><div><small>소중한 인연</small><b>{store.relationships.length}</b></div><div><small>왕국의 비망록</small><b>{store.memos.length}</b></div></section>

    <section className="account-activity panel glass-panel">
      <header><div><span className="eyebrow">RITA POINTS & HISTORY</span><h2>리타 포인트와 이용 기록</h2><p>현재 잔액, 이번 달 사용량과 왕실에서 받은 선물을 확인하세요.</p></div><Coins size={24}/></header>
      {demoMode ? <p className="account-activity-empty">로그인하면 계정별 포인트와 이용 기록을 확인할 수 있어요.</p> : <>
        <div className="point-summary-grid">
          <AccountPoint label="현재 총 포인트" value={usage?.totalRemaining} accent/>
          <AccountPoint label="이번 달 남은 포인트" value={usage?.monthlyRemaining}/>
          <AccountPoint label="보너스·선물 포인트" value={usage?.bonusRemaining}/>
          <span className="point-plan"><b>{tierLabel(usage?.tier)}</b><small>현재 이용 등급</small><em>이번 달 {usage?.monthlyUsed ?? 0}P 사용</em></span>
        </div>
        {activityError && <p className="account-activity-error">{activityError}</p>}
        <div className="activity-columns">
          <section><h3><History size={16}/>AI 이용 기록</h3>{activity.usage.length ? <div className="activity-list">{usagePage.visibleItems.map((item) => <article key={item.id}><span><b>{requestTypeLabel(item.requestType)}</b><small>{new Date(item.createdAt).toLocaleString('ko-KR')} · {item.model || '처리 전'}</small></span><strong className={item.status}>{item.status === 'released' ? '환불' : item.status === 'reserved' ? '처리 중' : `-${item.points}P`}</strong></article>)}</div> : <p className="account-activity-empty">아직 리타 AI 이용 기록이 없습니다.</p>}<Pagination page={usagePage.page} totalItems={usagePage.totalItems} onPageChange={usagePage.setPage} label="AI 이용 기록"/></section>
          <section><h3><Gift size={16}/>받은 선물</h3>{activity.gifts.length ? <div className="activity-list">{giftPage.visibleItems.map((item) => <article key={item.id}><span><b>{giftLabel(item)}</b><small>{new Date(item.createdAt).toLocaleString('ko-KR')}{item.reason ? ` · ${item.reason}` : ''}</small></span><strong className="gift">{item.benefitType === 'ai_points' ? `+${item.amount}P` : '선물'}</strong></article>)}</div> : <p className="account-activity-empty">아직 받은 선물이 없습니다.</p>}<Pagination page={giftPage.page} totalItems={giftPage.totalItems} onPageChange={giftPage.setPage} label="받은 선물"/></section>
        </div>
        <NavLink className="plans-link" to="/plans"><Crown size={15}/>요금제와 {config.planCatalog.trialDays}일 무료 체험 비교<ChevronRight size={15}/></NavLink>
      </>}
    </section>

    <section className="kingdom-settings panel glass-panel">
      <header><span className="eyebrow">PALACE SETTINGS</span><h2>환경 설정</h2><p>공주님의 왕국과 리타를 원하는 방식으로 관리하세요.</p></header>
      <div className="setting-list">
        <SettingRow icon={UserRound} title="프로필" description="공주 이름과 한 줄 소개" onClick={() => setSetting('profile')}/>
        <SettingRow icon={Image} title="배경 설정" description="페이지별 왕궁 배경과 표시 방식" onClick={() => setSetting('background')}/>
        <SettingRow icon={Bell} title="알림 설정" description="왕국 안에서 일정과 기록 알림 받기" onClick={() => setSetting('notifications')}/>
        <SettingRow icon={Sparkles} title="AI 설정" description="AI 메이드 리타의 답변 방식" onClick={() => setSetting('ai')}/>
        <SettingRow icon={Database} title="데이터 관리" description="왕국 기록 내보내기와 보관" onClick={() => setSetting('data')}/>
        {isAdmin && <NavLink className="admin-setting-link" to="/admin"><span><ShieldCheck size={18}/></span><div><b>왕실 관리</b><small>포인트·꾸미기 선물과 지급 이력</small></div><ChevronRight size={16}/></NavLink>}
      </div>
      {setting && <SettingPanel setting={setting} onClose={() => setSetting(null)}>
        {setting === 'profile' && <div className="setting-form">
          <fieldset className="princess-picker">
            <legend>공주 고르기</legend>
            <p>선택한 공주는 로비의 전신 이미지와 왕국 안의 프로필 사진에 함께 적용됩니다.</p>
            <div className="princess-picker-grid">
              {princessOptions.map((princess) => <button type="button" key={princess.id} className={draftPrincessId === princess.id ? 'selected' : ''} onClick={() => setDraftPrincessId(princess.id)} aria-pressed={draftPrincessId === princess.id}>
                <span><PrincessPortrait princess={princess} loading="lazy"/></span>
                <b>{princess.name}</b>
                <small>{princess.description}</small>
              </button>)}
            </div>
          </fieldset>
          <label>공주 이름<input value={draftName} onChange={(event) => setDraftName(event.target.value)}/></label>
          <label>한 줄 소개<textarea value={draftIntro} onChange={(event) => setDraftIntro(event.target.value)}/></label>
          <div className="form-row"><label>시간대<select value={timezone} onChange={(event) => setTimezone(event.target.value)}><option value="Asia/Seoul">대한민국 · 서울</option><option value="UTC">UTC</option></select></label><label>하루 시작 시각<input type="time" value={serviceDayStartsAt} onChange={(event) => setServiceDayStartsAt(event.target.value)}/></label></div>
          <button className="primary" onClick={() => void saveProfile()}><Save size={14}/> 저장</button>
        </div>}
        {setting === 'background' && <BackgroundSettings/>}
        {setting === 'notifications' && <label className="setting-toggle"><span><b>앱 내부 알림</b><small>일정과 확인할 기록을 헤더에서 안내합니다.</small></span><input type="checkbox" checked={notifications} onChange={(event) => void changeNotifications(event.target.checked)}/></label>}
        {setting === 'ai' && <label className="setting-select">리타의 답변 방식<select value={aiStyle} onChange={(event) => { const value = event.target.value as UserPreferences['aiStyle']; setAiStyle(value); writeAccountStorage('rumen-rita-style', value); void persistPreferences({ aiStyle: value }) }}><option value="concise">간결하게</option><option value="warm">다정하게</option><option value="detailed">자세하게</option></select><small>계정에 저장되어 다른 기기에서도 같은 답변 방식을 사용합니다.</small></label>}
        {setting === 'data' && (demoMode ? <div className="setting-note"><Database size={20}/><div><b>데모 왕국 관리</b><p>수정한 데모 기록을 처음 예시 상태로 되돌릴 수 있습니다.</p><button onClick={() => { if (confirm('데모 왕국을 처음 예시 데이터로 되돌릴까요?')) { onResetDemo(); setSetting(null) } }}>데모 데이터 초기화</button></div></div> : <div className="data-management-unified"><DataExportPanel demoMode={false} embedded/><section className="backup-restore"><div><b>백업 기록 가져오기</b><p>이전에 내려받은 루멘왕국 JSON 백업을 현재 계정에 추가합니다.</p></div><label>JSON 백업 선택<input type="file" accept="application/json,.json" onChange={(event) => void importData(event.target.files?.[0])}/></label><button className="danger account-delete" disabled={deletingAccount} onClick={() => void deleteAccount()}>{deletingAccount ? '계정 삭제 중…' : '계정과 모든 데이터 삭제'}</button></section></div>)}
      </SettingPanel>}
    </section>

    <section className="kingdom-connections panel glass-panel"><header><span className="eyebrow">CONNECTION</span><h2>연결 상태</h2></header><div className="connection-row"><span><Database size={18}/></span><div><b>계정별 기록 저장소</b><small>각 계정과 게스트 기록을 이 기기에서 분리 보관</small></div><em>분리됨</em></div><div className="connection-row"><span><Sparkles size={18}/></span><div><b>AI 메이드 리타</b><small>계정별 대화, 문서 요약, 명함 정리</small></div><em>로그인 후 확인</em></div><div className="connection-row"><span><Cloud size={18}/></span><div><b>일정 클라우드 동기화</b><small>왕실 일정표를 로그인 계정별로 안전하게 동기화</small></div><em>{isSupabaseConfigured ? '준비됨' : '설정 필요'}</em></div></section>

    <button className="signout-button kingdom-signout" onClick={() => void onSignOut()}><LogOut size={16}/> {demoMode ? '로그인해서 내 왕국 만들기' : '왕국에서 나가기'}</button>
  </div>
}

function AccountStat({ label, value }: { label: string; value: number }) { return <span><b>{value}</b><small>{label}</small></span> }
function AccountPoint({ label, value, accent = false }: { label: string; value?: number; accent?: boolean }) { return <span className={accent ? 'accent' : ''}><b>{value === undefined ? '—' : `${value.toLocaleString()}P`}</b><small>{label}</small></span> }
function tierLabel(tier?: 'free' | 'royal' | 'royal_ai') { return tier === 'royal_ai' ? 'Royal AI' : tier === 'royal' ? 'Royal' : 'Free' }
function requestTypeLabel(value: string) { if (value === 'interpret-request') return '리타 대화·요청 정리'; if (value.startsWith('attachment:')) return '첨부 파일 분석'; return value === 'chat' ? '리타 대화' : value }
function giftLabel(item: RitaActivity['gifts'][number]) { return item.benefitType === 'ai_points' ? `리타 포인트 ${item.amount}점` : item.benefitType === 'all_access' ? '전체 기능 이용권' : `꾸미기 이용권 · ${item.benefitKey}` }

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
