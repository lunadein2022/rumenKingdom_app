import { ArrowRight, BriefcaseBusiness, CalendarDays, Clock3, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { QuestRow } from '../../components/QuestRow'
import { RitaFace } from '../../components/RitaFace'
import { EmptyState, SectionTitle } from '../../components/Common'
import { projectProgress, useKingdomStore } from '../../store'
import { lobbyGreetingLead, serviceDate } from '../../lib/serviceTime'
import { useServiceDate } from '../../lib/useServiceDate'
import { questOccursOn } from '../../lib/recurrence'
import type { Quest } from '../../types'

export function LobbyPage() {
  const navigate = useNavigate()
  const { events, quests, projects } = useKingdomStore()
  const today = useServiceDate()
  const todayEvents = events.filter((event) => event.date <= today && (event.endDate ?? event.date) >= today)
  const todayQuests = quests.filter((quest) => isTodayQuest(quest, today))
  const openTodayQuests = todayQuests.filter((quest) => !quest.done)
  const activeProjects = projects.filter((project) => project.status === 'active')
  const dueToday = quests.filter((quest) => !quest.done && (quest.scheduledDate === today || quest.due.startsWith('오늘')))
  const completedToday = todayQuests.filter((quest) => quest.done)
  const priorityProject = [...activeProjects].sort((a, b) => a.due.localeCompare(b.due))[0]

  return <div className="lobby-hub">
    <section className="lobby-hero" aria-labelledby="lobby-briefing-title">
      <img className="lobby-princess" src="/assets/characters/princess-full.webp" alt="루멘왕국의 공주"/>
      <div className="lobby-hero-glow"/>
      <div className="lobby-briefing-copy">
        <div className="lobby-rita-greeting"><RitaFace expression="welcome"/><span><small>RITA'S MORNING REPORT</small><b>리타의 오늘 브리핑</b></span></div>
        <h1 id="lobby-briefing-title">{lobbyGreetingLead()}<br/>공주님.</h1>
        <p>오늘은 일정 <b>{todayEvents.length}건</b>과 퀘스트 <b>{openTodayQuests.length}건</b>이 예정되어 있습니다.</p>
        <p>{priorityProject ? `${priorityProject.title} 메인퀘스트의 마감과 진행 상황을 먼저 살펴보는 것을 추천드려요.` : '오늘은 새 목표를 정하고 차분히 하루를 시작하기 좋은 날이에요.'}</p>
        <div className="lobby-vitals" aria-label="오늘의 핵심 현황">
          <LobbyVital label="오늘 일정" value={todayEvents.length}/>
          <LobbyVital label="오늘 퀘스트" value={openTodayQuests.length}/>
          <LobbyVital label="진행 메인퀘스트" value={activeProjects.length}/>
          <LobbyVital label="오늘 마감" value={dueToday.length}/>
          <LobbyVital label="오늘 완료" value={completedToday.length}/>
        </div>
        <nav className="lobby-destination-nav" aria-label="추천 공간">
          <button className="primary" onClick={() => navigate('/office')}><BriefcaseBusiness size={15}/> 집무실로</button>
          <button onClick={() => navigate('/calendar')}><CalendarDays size={15}/> 오늘 일정</button>
          <button onClick={() => navigate('/rita')}><Sparkles size={15}/> 리타에게 묻기</button>
        </nav>
      </div>
    </section>

    <div className="lobby-summary-grid">
      <section className="lobby-summary-panel glass-panel">
        <SectionTitle title="오늘의 퀘스트" action="집무실에서 전체보기" onAction={() => navigate('/office')}/>
        <div className="lobby-quest-list">{todayQuests.slice(0, 5).map((quest) => <QuestRow key={quest.id} id={quest.id}/>)}</div>
        {!todayQuests.length && <EmptyState title="오늘 예정된 퀘스트가 없어요" description="집무실에서 오늘 할 일을 계획해 보세요." action="집무실로" onAction={() => navigate('/office')}/>} 
      </section>

      <section className="lobby-summary-panel glass-panel">
        <SectionTitle title="진행 중 메인퀘스트" action="집무실에서 전체보기" onAction={() => navigate('/office')}/>
        <div className="lobby-project-list">{activeProjects.slice(0, 3).map((project) => {
          const progress = projectProgress(project, quests)
          return <button key={project.id} onClick={() => navigate(`/office/projects/${project.id}`)}><span><b>{project.title}</b><small><Clock3 size={11}/>{project.due}</small></span><strong>{progress}%</strong><span className="progress"><i style={{ width: `${progress}%` }}/></span><ArrowRight size={14}/></button>
        })}</div>
        {!activeProjects.length && <EmptyState title="진행 중인 메인퀘스트가 없어요" action="집무실로" onAction={() => navigate('/office')}/>} 
      </section>
    </div>

    <section className="lobby-rita-word"><RitaFace expression="happy"/><div><small>리타 한마디</small><p>공주님, 오늘도 하나씩 차분히 진행하시면 충분합니다.<br/>제가 곁에서 정리해 드리겠습니다.</p></div><button onClick={() => navigate('/rita')}>리타와 대화하기 <ArrowRight size={14}/></button></section>
  </div>
}

function LobbyVital({ label, value }: { label: string; value: number }) {
  return <span><b>{value}</b><small>{label}</small></span>
}

function isTodayQuest(quest: Quest, today: string) {
  // 반복 퀘스트는 오늘 해당하는 날에만 표시.
  if (quest.recurrenceRule) return questOccursOn(quest, today, serviceDate(new Date(quest.createdAt)))
  // 오늘의 퀘스트 = 모든 서브퀘스트 + 오늘로 설정된 일일퀘스트 (메인퀘스트는 제외)
  if (quest.type === 'sub') return true
  return quest.scheduledDate === today || quest.due.startsWith('오늘')
}
