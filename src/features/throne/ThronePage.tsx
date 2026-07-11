import { Bell, ChevronRight, Cloud, Crown, Database, Image, LogOut, Pencil, Save, Sparkles, UserRound, X } from 'lucide-react'
import { useState } from 'react'
import { isSupabaseConfigured } from '../../lib/supabase'
import { useKingdomStore } from '../../store'

type SettingId = 'profile' | 'background' | 'notifications' | 'ai' | 'data' | null

export function ThronePage({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const store = useKingdomStore()
  const [setting, setSetting] = useState<SettingId>(null)
  const [name, setName] = useState(() => localStorage.getItem('rumen-princess-name') || '루멘왕국의 공주')
  const [intro, setIntro] = useState(() => localStorage.getItem('rumen-princess-intro') || '차분하게 왕국의 하루를 가꾸어 가는 중입니다.')
  const [draftName, setDraftName] = useState(name)
  const [draftIntro, setDraftIntro] = useState(intro)
  const [notifications, setNotifications] = useState(() => localStorage.getItem('rumen-in-app-notifications') !== 'off')
  const [aiStyle, setAiStyle] = useState(() => localStorage.getItem('rumen-rita-style') || 'concise')
  const recordCount = store.projects.length + store.quests.length + store.memos.length + store.relationships.length + store.diaries.length

  const saveProfile = () => {
    const nextName = draftName.trim() || '루멘왕국의 공주'
    const nextIntro = draftIntro.trim()
    setName(nextName); setIntro(nextIntro)
    localStorage.setItem('rumen-princess-name', nextName)
    localStorage.setItem('rumen-princess-intro', nextIntro)
    setSetting(null)
  }
  const exportData = () => {
    const data = JSON.stringify({ exportedAt: new Date().toISOString(), projects: store.projects, quests: store.quests, memos: store.memos, relationships: store.relationships, diaries: store.diaries, events: store.events }, null, 2)
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `rumen-kingdom-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url)
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
        {setting === 'profile' && <div className="setting-form"><label>공주 이름<input value={draftName} onChange={(event) => setDraftName(event.target.value)}/></label><label>한 줄 소개<textarea value={draftIntro} onChange={(event) => setDraftIntro(event.target.value)}/></label><button className="primary" onClick={saveProfile}><Save size={14}/> 저장</button></div>}
        {setting === 'background' && <div className="setting-note"><Image size={20}/><div><b>페이지별 왕궁 배경 사용 중</b><p>각 공간에 지정된 왕궁 배경을 유지합니다. 추가 배경 선택 기능은 에셋이 늘어날 때 확장할 수 있어요.</p></div></div>}
        {setting === 'notifications' && <label className="setting-toggle"><span><b>앱 내부 알림</b><small>일정과 확인할 기록을 헤더에서 안내합니다.</small></span><input type="checkbox" checked={notifications} onChange={(event) => { setNotifications(event.target.checked); localStorage.setItem('rumen-in-app-notifications', event.target.checked ? 'on' : 'off') }}/></label>}
        {setting === 'ai' && <label className="setting-select">리타의 답변 방식<select value={aiStyle} onChange={(event) => { setAiStyle(event.target.value); localStorage.setItem('rumen-rita-style', event.target.value) }}><option value="concise">간결하게</option><option value="warm">다정하게</option><option value="detailed">자세하게</option></select><small>실제 Claude 요청 프롬프트 연동은 서버 설정 단계에서 적용합니다.</small></label>}
        {setting === 'data' && <div className="setting-note"><Database size={20}/><div><b>내 왕국 기록 보관</b><p>현재 기기에 저장된 프로젝트, 퀘스트, 일정, 기록을 JSON 파일로 내보냅니다.</p><button onClick={exportData}>왕국 기록 내보내기</button></div></div>}
      </SettingPanel>}
    </section>

    <section className="kingdom-connections panel glass-panel"><header><span className="eyebrow">CONNECTION</span><h2>연결 상태</h2></header><div className="connection-row"><span><Database size={18}/></span><div><b>기록 저장소</b><small>로그인과 왕국 기록의 안전한 보관</small></div><em>{isSupabaseConfigured ? '사용 가능' : '설정 필요'}</em></div><div className="connection-row"><span><Sparkles size={18}/></span><div><b>AI 메이드 리타</b><small>대화, 문서 요약, 명함 정리</small></div><em>로그인 후 확인</em></div><div className="connection-row"><span><Cloud size={18}/></span><div><b>클라우드 동기화</b><small>여러 기기에서 같은 왕국 기록 사용</small></div><em>{isSupabaseConfigured ? '준비됨' : '설정 필요'}</em></div></section>

    <button className="signout-button kingdom-signout" onClick={() => void onSignOut()}><LogOut size={16}/> 왕국에서 나가기</button>
  </div>
}

function AccountStat({ label, value }: { label: string; value: number }) { return <span><b>{value}</b><small>{label}</small></span> }

function SettingRow({ icon: Icon, title, description, onClick }: { icon: typeof UserRound; title: string; description: string; onClick: () => void }) {
  return <button onClick={onClick}><span><Icon size={18}/></span><div><b>{title}</b><small>{description}</small></div><ChevronRight size={16}/></button>
}

function SettingPanel({ setting, onClose, children }: { setting: Exclude<SettingId, null>; onClose: () => void; children: React.ReactNode }) {
  const title = { profile: '프로필', background: '배경 설정', notifications: '알림 설정', ai: 'AI 설정', data: '데이터 관리' }[setting]
  return <div className="setting-panel"><div><h3>{title}</h3><button onClick={onClose} aria-label="설정 닫기"><X size={16}/></button></div>{children}</div>
}
