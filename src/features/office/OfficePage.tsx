import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ArchiveRestore, Check, CheckCircle2, ChevronRight, Clock3, GripVertical, Link2, Pencil, Plus, Repeat, Search, Sparkles, Trash2, Unlink, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { BackButton } from '../../components/BackButton'
import { EmptyState, Metric, SectionTitle } from '../../components/Common'
import { Pagination, usePaginatedList } from '../../components/Pagination'
import { projectProgress, useKingdomStore } from '../../store'
import type { Project, ProjectStatus, Quest, QuestPriority, QuestType } from '../../types'
import { serviceDate } from '../../lib/serviceTime'
import { useServiceDate } from '../../lib/useServiceDate'
import { accountStorageKey } from '../../lib/accountScope'
import { clearPersistentState, usePersistentState } from '../../lib/usePersistentState'
import { buildRecurrenceRule, parseRecurrenceRule, questOccursOn } from '../../lib/recurrence'

type ProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
type QuestInput = Omit<Quest, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>
type QuestFilter = 'all' | 'linked' | 'independent' | 'today' | 'week'

export function OfficePage() {
  const navigate = useNavigate()
  const { projects, quests, questOrder, reorderQuests, addProject, updateProject, deleteProject, addQuest, updateQuest, deleteQuest } = useKingdomStore()
  const [editingProject, setEditingProject] = useState<Project | null | undefined>(undefined)
  const [editingQuest, setEditingQuest] = useState<Quest | null | undefined>(undefined)
  const [filter, setFilter] = useState<QuestFilter>('all')
  const [query, setQuery] = useState('')
  const [draggedQuestId, setDraggedQuestId] = useState<string | null>(null)
  const draggedQuestIdRef = useRef<string | null>(null)
  const [dropProjectId, setDropProjectId] = useState<string | null>(null)
  const [dropQuestId, setDropQuestId] = useState<string | null>(null)
  const [dropNotice, setDropNotice] = useState('')
  useServiceDate()
  const activeProjects = projects.filter((project) => project.status === 'active' || project.status === 'planned')
  const completedProjects = projects.filter((project) => project.status === 'completed')
  const todayOpen = quests.filter((quest) => !quest.done && isTodayQuest(quest))
  const waiting = quests.filter((quest) => !quest.done && !isTodayQuest(quest))

  const visibleQuests = useMemo(() => quests.filter((quest) => {
    if (filter === 'linked' && !quest.projectId) return false
    if (filter === 'independent' && quest.projectId) return false
    if (filter === 'today' && !isTodayQuest(quest)) return false
    if (filter === 'week' && !isThisWeekQuest(quest)) return false
    const normalized = query.trim().toLocaleLowerCase('ko')
    const project = projects.find((item) => item.id === quest.projectId)?.title ?? '독립 퀘스트'
    return !normalized || `${quest.title} ${project}`.toLocaleLowerCase('ko').includes(normalized)
  }).sort((a, b) => {
    if (a.done !== b.done) return Number(a.done) - Number(b.done)
    const oa = questOrder[a.id]
    const ob = questOrder[b.id]
    // 사용자가 드래그로 지정한 순서를 우선한다. 지정 안 된 항목은 마감일 순.
    if (oa != null && ob != null) return oa - ob
    if (oa != null) return -1
    if (ob != null) return 1
    return (a.scheduledDate ?? '9999').localeCompare(b.scheduledDate ?? '9999')
  }), [filter, projects, query, quests, questOrder])
  const projectPage = usePaginatedList(activeProjects, 'office-projects')
  const questPage = usePaginatedList(visibleQuests, `${filter}:${query}`)

  const saveProject = async (input: ProjectInput) => {
    const saved = editingProject ? await updateProject(editingProject.id, input) : Boolean(await addProject(input))
    if (saved) setEditingProject(undefined)
  }
  const saveQuest = async (input: QuestInput) => {
    const saved = editingQuest ? await updateQuest(editingQuest.id, input) : Boolean(await addQuest(input))
    if (saved) setEditingQuest(undefined)
  }
  const resetDragState = () => {
    draggedQuestIdRef.current = null
    setDraggedQuestId(null)
    setDropProjectId(null)
    setDropQuestId(null)
  }
  const finishDrop = async (questId: string, project?: Project) => {
    if (!quests.some((quest) => quest.id === questId)) return
    const saved = await updateQuest(questId, { projectId: project?.id, project: project?.title })
    if (saved) setDropNotice(project ? `${project.title}에 퀘스트를 연결했습니다.` : '독립 퀘스트로 변경했습니다.')
    resetDragState()
    window.setTimeout(() => setDropNotice(''), 2200)
  }
  const reorderTo = (questId: string, overQuestId: string) => {
    const ids = visibleQuests.map((quest) => quest.id)
    const from = ids.indexOf(questId)
    const to = ids.indexOf(overQuestId)
    if (from >= 0 && to >= 0 && from !== to) {
      const next = [...ids]
      next.splice(to, 0, next.splice(from, 1)[0])
      reorderQuests(next)
      setDropNotice('퀘스트 순서를 변경했어요.')
      window.setTimeout(() => setDropNotice(''), 2200)
    }
    resetDragState()
  }
  const startPointerDrag = (questId: string, event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || event.pointerType === 'touch') return
    event.preventDefault()
    const origin = { x: event.clientX, y: event.clientY }
    let active = false
    let targetProjectId: string | null = null
    let targetQuestId: string | null = null

    const cleanup = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', cancel)
      document.body.classList.remove('office-pointer-dragging')
    }
    const move = (pointer: PointerEvent) => {
      if (!active && Math.hypot(pointer.clientX - origin.x, pointer.clientY - origin.y) < 6) return
      active = true
      pointer.preventDefault()
      draggedQuestIdRef.current = questId
      setDraggedQuestId(questId)
      document.body.classList.add('office-pointer-dragging')
      const element = document.elementFromPoint(pointer.clientX, pointer.clientY)
      const linkTarget = element?.closest<HTMLElement>('[data-project-id], [data-independent-drop]')
      if (linkTarget) {
        targetProjectId = linkTarget.dataset.projectId ?? (linkTarget.hasAttribute('data-independent-drop') ? '' : null)
        targetQuestId = null
      } else {
        targetProjectId = null
        const overId = element?.closest<HTMLElement>('[data-quest-id]')?.dataset.questId ?? null
        targetQuestId = overId && overId !== questId ? overId : null
      }
      setDropProjectId(targetProjectId || null)
      setDropQuestId(targetQuestId)
    }
    const release = () => {
      cleanup()
      const project = activeProjects.find((item) => item.id === targetProjectId)
      if (active && targetProjectId === '') void finishDrop(questId)
      else if (active && project) void finishDrop(questId, project)
      else if (active && targetQuestId) reorderTo(questId, targetQuestId)
      else resetDragState()
    }
    const cancel = () => {
      cleanup()
      resetDragState()
    }

    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', release, { once: true })
    window.addEventListener('pointercancel', cancel, { once: true })
  }

  return <div>
    <div className="metric-row">
      <Metric label="진행 중" value={String(activeProjects.filter((project) => project.status === 'active').length)} tone="purple"/>
      <Metric label="오늘 할 일" value={String(todayOpen.length)} tone="gold"/>
      <Metric label="완료 퀘스트" value={String(quests.filter((quest) => quest.done).length)} tone="green"/>
      <Metric label="대기" value={String(waiting.length)} tone="blue"/>
    </div>

    <div className="office-command-layout">
      <section className="panel glass-panel office-project-pane">
        <SectionTitle title="메인퀘스트" action="새 메인퀘스트" onAction={() => setEditingProject(null)}/>
        <p className="office-pane-intro">목표와 기간을 관리해요. 퀘스트 연결은 선택사항입니다.</p>
        <div className="office-project-list">
          {projectPage.visibleItems.map((project) => {
            const linked = quests.filter((quest) => quest.projectId === project.id)
            const progress = projectProgress(project, quests)
            return <article data-project-id={project.id} className={`office-project-item royal-card ${dropProjectId === project.id ? 'drop-ready' : ''}`} key={project.id}>
              <button className="office-project-main" onClick={() => navigate(`/office/projects/${project.id}`)}>
                <span className="project-tag">{project.tag}</span>
                <span className="office-project-title"><b>{project.title}</b><small>{linked.length ? `연결 퀘스트 ${linked.filter((quest) => quest.done).length}/${linked.length}` : '연결된 퀘스트 없음'}</small></span>
                <strong>{progress}%</strong>
                <span className="progress"><i style={{ width: `${progress}%` }}/></span>
              </button>
              <div className="office-project-actions"><button onClick={() => setEditingProject(project)} aria-label={`${project.title} 편집`}><Pencil size={14}/></button><button onClick={() => { if (confirm(`“${project.title}” 메인퀘스트를 삭제할까요? 연결된 퀘스트는 독립 퀘스트로 남습니다.`)) deleteProject(project.id) }} aria-label={`${project.title} 삭제`}><Trash2 size={14}/></button><button onClick={() => navigate(`/office/projects/${project.id}`)} aria-label={`${project.title} 상세`}><ChevronRight size={15}/></button></div>
            </article>
          })}
        </div>
        <Pagination page={projectPage.page} totalItems={projectPage.totalItems} onPageChange={projectPage.setPage} label="메인퀘스트"/>
        {!activeProjects.length && <EmptyState title="진행 중인 메인퀘스트가 없어요" action="새 메인퀘스트 만들기" onAction={() => setEditingProject(null)}/>} 
        <button className="completed-link" onClick={() => navigate('/office/completed')}><CheckCircle2 size={16}/> 완료 기록 {completedProjects.length}건 보기</button>
      </section>

      <section className="panel glass-panel office-quest-pane">
        <div className="office-quest-heading"><div><h2>전체 퀘스트</h2><p>손잡이를 드래그해 순서를 바꾸거나 메인퀘스트로 끌어 연결할 수 있어요.</p></div><button className="primary" onClick={() => setEditingQuest(null)}><Plus size={15}/> 새 퀘스트</button></div>
        {draggedQuestId && <div className="independent-drop-zone" data-independent-drop><Unlink size={15}/> 여기에 놓으면 독립 퀘스트로 변경됩니다.</div>}
        <div className="quest-command-bar">
          <label><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="퀘스트 검색"/></label>
          <div className="quest-filters">{filterOptions.map((option) => <button key={option.id} className={filter === option.id ? 'active' : ''} onClick={() => setFilter(option.id)}>{option.label}</button>)}</div>
        </div>
        <div className="office-quest-list">
          {questPage.visibleItems.map((quest) => <OfficeQuestItem key={quest.id} quest={quest} project={projects.find((project) => project.id === quest.projectId)} dragging={draggedQuestId === quest.id} reorderTarget={dropQuestId === quest.id} onEdit={() => setEditingQuest(quest)} onDelete={() => { if (confirm(`“${quest.title}” 퀘스트를 삭제할까요?`)) deleteQuest(quest.id) }} onPointerDragStart={startPointerDrag}/>) }
        </div>
        <Pagination page={questPage.page} totalItems={questPage.totalItems} onPageChange={questPage.setPage} label={`${filterOptions.find((item) => item.id === filter)?.label ?? '전체'} 퀘스트`}/>
        {!visibleQuests.length && <EmptyState title="조건에 맞는 퀘스트가 없어요" action="새 퀘스트 만들기" onAction={() => setEditingQuest(null)}/>} 
      </section>
    </div>

    {editingProject !== undefined && <ProjectModal project={editingProject} onClose={() => setEditingProject(undefined)} onSave={saveProject}/>} 
    {editingQuest !== undefined && <QuestModal quest={editingQuest} projects={activeProjects} onClose={() => setEditingQuest(undefined)} onSave={saveQuest}/>} 
    {dropNotice && <div className="office-drop-toast" role="status"><CheckCircle2 size={15}/>{dropNotice}</div>}
  </div>
}

function OfficeQuestItem({ quest, project, dragging, reorderTarget, onEdit, onDelete, onPointerDragStart }: { quest: Quest; project?: Project; dragging?: boolean; reorderTarget?: boolean; onEdit: () => void; onDelete: () => void; onPointerDragStart?: (questId: string, event: ReactPointerEvent<HTMLElement>) => void }) {
  const toggleQuest = useKingdomStore((state) => state.toggleQuest)
  return <article data-quest-id={quest.id} className={`office-quest-item ${quest.done ? 'done' : ''} ${onPointerDragStart ? 'drag-enabled' : ''} ${dragging ? 'is-dragging' : ''} ${reorderTarget ? 'reorder-target' : ''}`}>
    <span className="quest-drag-handle" onPointerDown={(event) => onPointerDragStart?.(quest.id, event)} aria-label={`${quest.title} 드래그하여 순서 변경 또는 메인퀘스트에 연결`} title="드래그하여 순서를 바꾸거나, 메인퀘스트로 끌어 연결하세요"><GripVertical size={15}/></span>
    <button className="quest-toggle" onClick={() => toggleQuest(quest.id)} aria-label={`${quest.title} ${quest.done ? '미완료로 변경' : '완료'}`}><span>{quest.done && <Check size={13}/>}</span></button>
    <div className="office-quest-copy" onPointerDown={(event) => onPointerDragStart?.(quest.id, event)}><div><b>{quest.title}</b><em>{quest.type === 'daily' ? '일일' : '서브'}</em>{quest.recurrenceRule && <em className="recur-badge"><Repeat size={9}/>{recurrenceShort(quest.recurrenceRule)}</em>}</div><small className={project ? 'linked-label' : 'independent-label'}>{project ? <><Link2 size={11}/>{project.title}</> : <><Unlink size={11}/>독립 퀘스트</>}</small></div>
    <time><Clock3 size={12}/>{questDueLabel(quest)}</time>
    <i className={`priority ${quest.priority}`}/>
    <button className="quest-icon-action" onClick={onEdit} aria-label={`${quest.title} 편집`}><Pencil size={14}/></button>
    <button className="quest-icon-action danger-icon" onClick={onDelete} aria-label={`${quest.title} 삭제`}><Trash2 size={14}/></button>
  </article>
}

export function ProjectDetailPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { projects, quests, updateProject, deleteProject, setProjectStatus, addQuest, updateQuest, deleteQuest } = useKingdomStore()
  const [editingProject, setEditingProject] = useState(false)
  const [editingQuest, setEditingQuest] = useState<Quest | null | undefined>(undefined)
  const [picking, setPicking] = useState(false)
  const project = projects.find((item) => item.id === projectId)
  if (!project) return <div><BackButton fallback="/office"/><section className="panel glass-panel detail-panel"><EmptyState title="메인퀘스트를 찾을 수 없어요" action="집무실로 이동" onAction={() => navigate('/office', { replace: true })}/></section></div>

  const linked = quests.filter((quest) => quest.projectId === project.id)
  const daily = linked.filter((quest) => quest.type === 'daily')
  const sub = linked.filter((quest) => quest.type === 'sub')
  const progress = projectProgress(project, quests)
  const completedCount = linked.filter((quest) => quest.done).length
  const activeProjects = projects.filter((item) => item.status === 'active' || item.status === 'planned')
  const saveQuest = async (input: QuestInput) => {
    const saved = editingQuest ? await updateQuest(editingQuest.id, input) : Boolean(await addQuest(input))
    if (saved) setEditingQuest(undefined)
  }
  const remove = async () => { if (confirm(`“${project.title}” 메인퀘스트를 삭제할까요? 연결된 퀘스트는 독립 퀘스트로 남습니다.`) && await deleteProject(project.id)) navigate('/office', { replace: true }) }

  return <div>
    <BackButton fallback="/office" label="집무실로"/>
    <section className="project-detail panel glass-panel">
      <div className="detail-hero"><div><span className="eyebrow">MAIN QUEST · {project.tag}</span><h2>{project.title}</h2><p>{project.description}</p></div><div className="detail-actions"><button onClick={() => navigate('/rita', { state: { prompt: `${project.title} 메인퀘스트를 현재 진행률과 연결 퀘스트 기준으로 요약해줘` } })}><Sparkles size={15}/> 리타에게 요약 요청</button><button onClick={() => setEditingProject(true)}><Pencil size={15}/> 편집</button></div></div>
      <div className="project-detail-grid"><dl><div><dt>기간</dt><dd>{project.startDate} — {project.due}</dd></div><div><dt>상태</dt><dd>{statusLabel[project.status]}</dd></div><div><dt>우선순위</dt><dd>{priorityLabel[project.priority]}</dd></div><div><dt>태그</dt><dd>{project.tag}</dd></div></dl><div className="project-progress-orb"><span>{progress}%</span><small>{linked.length ? `${linked.length}개 중 ${completedCount}개 완료` : '연결 퀘스트 없음 · 0%'}</small></div></div>
      <div className="linked-quests">
        <LinkedQuestSection title="일일퀘스트" quests={daily} projects={projects} onEdit={setEditingQuest} onDelete={deleteQuest}/>
        <LinkedQuestSection title="서브퀘스트" quests={sub} projects={projects} onEdit={setEditingQuest} onDelete={deleteQuest}/>
      </div>
      <div className="project-link-actions"><button className="primary" onClick={() => setEditingQuest(null)}><Plus size={15}/> 새 연결 퀘스트</button><button onClick={() => setPicking(true)}><Link2 size={15}/> 연결되지 않은 퀘스트 가져오기</button></div>
      <div className="detail-footer-actions">{project.status !== 'completed' ? <button className="primary" onClick={() => void setProjectStatus(project.id, 'completed')}><CheckCircle2 size={16}/> 메인퀘스트 완료</button> : <button onClick={() => void setProjectStatus(project.id, 'active')}><ArchiveRestore size={16}/> 다시 진행하기</button>}<button className="danger" onClick={() => void remove()}><Trash2 size={16}/> 삭제</button></div>
    </section>
    {editingProject && <ProjectModal
      project={project}
      onClose={() => setEditingProject(false)}
      onSave={async (input) => { if (await updateProject(project.id, input)) setEditingProject(false) }}
    />}
    {editingQuest !== undefined && <QuestModal quest={editingQuest} projects={activeProjects} defaultProjectId={project.id} onClose={() => setEditingQuest(undefined)} onSave={saveQuest}/>} 
    {picking && <IndependentQuestPicker quests={quests.filter((quest) => !quest.projectId)} project={project} onClose={() => setPicking(false)} onConnect={(quest) => updateQuest(quest.id, { projectId: project.id, project: project.title })}/>} 
  </div>
}

function LinkedQuestSection({ title, quests, projects, onEdit, onDelete }: { title: string; quests: Quest[]; projects: Project[]; onEdit: (quest: Quest) => void; onDelete: (id: string) => void }) {
  const pagination = usePaginatedList(quests, title)
  return <section><SectionTitle title={title}/>{quests.length ? pagination.visibleItems.map((quest) => <OfficeQuestItem key={quest.id} quest={quest} project={projects.find((project) => project.id === quest.projectId)} onEdit={() => onEdit(quest)} onDelete={() => { if (confirm(`“${quest.title}” 퀘스트를 삭제할까요?`)) onDelete(quest.id) }}/>) : <EmptyState title={`연결된 ${title}가 없어요`}/>}<Pagination page={pagination.page} totalItems={pagination.totalItems} onPageChange={pagination.setPage} label={title}/></section>
}

function IndependentQuestPicker({ quests, project, onClose, onConnect }: { quests: Quest[]; project: Project; onClose: () => void; onConnect: (quest: Quest) => void }) {
  const pagination = usePaginatedList(quests, project.id)
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal glass-panel quest-picker" role="dialog" aria-modal="true" aria-labelledby="picker-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">CONNECT QUEST</span><h2 id="picker-title">독립 퀘스트 연결</h2></div><button onClick={onClose} aria-label="닫기"><X size={18}/></button></div><p>선택한 퀘스트를 <b>{project.title}</b>에 연결합니다.</p><div className="independent-picker-list">{pagination.visibleItems.map((quest) => <article key={quest.id}><span><b>{quest.title}</b><small>{quest.type === 'daily' ? '일일퀘스트' : '서브퀘스트'} · {questDueLabel(quest)}</small></span><button onClick={() => onConnect(quest)}><Link2 size={14}/> 연결</button></article>)}</div>{!quests.length && <EmptyState title="연결할 독립 퀘스트가 없어요"/>}<Pagination page={pagination.page} totalItems={pagination.totalItems} onPageChange={pagination.setPage} label="독립 퀘스트"/><div className="modal-actions"><button className="ghost" onClick={onClose}>닫기</button></div></section></div>
}

export function CompletedProjectsPage() {
  const navigate = useNavigate()
  const { projects, setProjectStatus } = useKingdomStore()
  const completed = projects.filter((project) => project.status === 'completed').sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
  const pagination = usePaginatedList(completed, 'completed-projects')
  return <div><BackButton fallback="/office" label="집무실로"/><section className="panel glass-panel completed-projects"><SectionTitle title="완료된 메인퀘스트"/>{completed.length ? pagination.visibleItems.map((project) => <article key={project.id}><button className="completed-project-main" onClick={() => navigate(`/office/projects/${project.id}`)}><CheckCircle2 size={18}/><span><b>{project.title}</b><small>{project.completedAt ? new Date(project.completedAt).toLocaleDateString('ko-KR') : '완료일 미상'} · {project.tag}</small></span><ChevronRight size={16}/></button><button onClick={() => setProjectStatus(project.id, 'active')}><ArchiveRestore size={15}/> 복원</button></article>) : <EmptyState title="완료된 메인퀘스트가 없어요" description="메인퀘스트를 완료하면 이곳에 기록됩니다."/>}<Pagination page={pagination.page} totalItems={pagination.totalItems} onPageChange={pagination.setPage} label="완료된 메인퀘스트"/></section></div>
}

function ProjectModal({ project, onClose, onSave }: { project: Project | null; onClose: () => void; onSave: (project: ProjectInput) => void | Promise<void> }) {
  const dk = (field: string) => accountStorageKey(`draft-project:${project?.id ?? 'new'}:${field}`)
  const [title, setTitle] = usePersistentState(dk('title'), project?.title ?? '')
  const [goal, setGoal] = usePersistentState(dk('goal'), project?.goal ?? '')
  const [description, setDescription] = usePersistentState(dk('description'), project?.description ?? '')
  const [memo, setMemo] = usePersistentState(dk('memo'), project?.memo ?? '')
  const [tags, setTags] = usePersistentState(dk('tags'), project?.tags?.join(', ') ?? project?.tag ?? '')
  const [startDate, setStartDate] = usePersistentState(dk('startDate'), project?.startDate ?? isoToday())
  const [due, setDue] = usePersistentState(dk('due'), project?.due ?? isoToday())
  const [tag, setTag] = usePersistentState(dk('tag'), project?.tag ?? 'Project')
  const [status, setStatus] = usePersistentState<ProjectStatus>(dk('status'), project?.status ?? 'active')
  const [priority, setPriority] = usePersistentState<QuestPriority>(dk('priority'), project?.priority ?? 'medium')
  const clearDraft = () => clearPersistentState(dk('title'), dk('goal'), dk('description'), dk('memo'), dk('tags'), dk('startDate'), dk('due'), dk('tag'), dk('status'), dk('priority'))
  const handleClose = () => { clearDraft(); onClose() }
  useEscapeClose(handleClose)
  return <div className="modal-backdrop" onMouseDown={handleClose}><form className="modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="project-modal-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); clearDraft(); onSave({ title: title.trim(), goal: goal.trim(), description: description.trim(), memo: memo.trim(), tags: tags.split(',').map((item) => item.trim()).filter(Boolean), progress: project?.progress ?? 0, startDate, due, tag: tag.trim() || 'Project', status, priority, favorite: project?.favorite ?? false, completedAt: status === 'completed' ? project?.completedAt ?? new Date().toISOString() : undefined }) }}><div className="modal-head"><div><span className="eyebrow">MAIN QUEST</span><h2 id="project-modal-title">{project ? '메인퀘스트 편집' : '새 메인퀘스트'}</h2></div><button type="button" onClick={handleClose} aria-label="닫기"><X size={18}/></button></div><label>제목<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} required/></label><label>목표<input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="이 메인퀘스트로 이루고 싶은 목표"/></label><label>짧은 설명<textarea className="modal-textarea compact" value={description} onChange={(event) => setDescription(event.target.value)}/></label><label>메모<textarea className="modal-textarea" value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="회의 내용, 링크, 진행 중 떠오른 내용을 자유롭게 기록하세요."/></label><div className="form-row"><label>시작일<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)}/></label><label>마감일<input type="date" value={due} min={startDate} onChange={(event) => setDue(event.target.value)}/></label></div><div className="form-row"><label>상태<select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)}><option value="planned">계획</option><option value="active">진행 중</option><option value="completed">완료</option><option value="archived">보관</option></select></label><label>우선순위<select value={priority} onChange={(event) => setPriority(event.target.value as QuestPriority)}><option value="high">높음</option><option value="medium">보통</option><option value="low">낮음</option></select></label></div><div className="form-row"><label>대표 태그<input value={tag} onChange={(event) => setTag(event.target.value)}/></label><label>추가 태그<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="쉼표로 구분"/></label></div><div className="automatic-progress-note"><Sparkles size={15}/><span>진행률은 연결된 일일·서브퀘스트의 완료 비율로 자동 계산됩니다.</span></div><div className="modal-actions"><button type="button" className="ghost" onClick={handleClose}>취소</button><button type="submit" className="primary"><Plus size={15}/>{project ? '저장' : '추가'}</button></div></form></div>
}

function QuestModal({ quest, projects, defaultProjectId, onClose, onSave }: { quest: Quest | null; projects: Project[]; defaultProjectId?: string; onClose: () => void; onSave: (quest: QuestInput) => void | Promise<void> }) {
  const dk = (field: string) => accountStorageKey(`draft-quest:${quest?.id ?? 'new'}:${field}`)
  const [title, setTitle] = usePersistentState(dk('title'), quest?.title ?? '')
  const [description, setDescription] = usePersistentState(dk('description'), quest?.description ?? '')
  const [memo, setMemo] = usePersistentState(dk('memo'), quest?.memo ?? '')
  const [tags, setTags] = usePersistentState(dk('tags'), quest?.tags?.join(', ') ?? '')
  const [type, setType] = usePersistentState<QuestType>(dk('type'), quest?.type ?? 'daily')
  const [projectId, setProjectId] = usePersistentState(dk('projectId'), quest?.projectId ?? defaultProjectId ?? '')
  const [scheduledDate, setScheduledDate] = usePersistentState(dk('scheduledDate'), quest?.scheduledDate ?? dateFromLegacyDue(quest?.due) ?? isoToday())
  const [scheduledTime, setScheduledTime] = usePersistentState(dk('scheduledTime'), quest?.scheduledTime ?? timeFromDue(quest?.due) ?? '')
  const [priority, setPriority] = usePersistentState<QuestPriority>(dk('priority'), quest?.priority ?? 'medium')
  const [recurrence, setRecurrence] = usePersistentState<string>(dk('recurrence'), parseRecurrenceRule(quest?.recurrenceRule).frequency ?? '')
  const [recurUntil, setRecurUntil] = usePersistentState<string>(dk('recurUntil'), parseRecurrenceRule(quest?.recurrenceRule).until ?? '')
  const clearDraft = () => clearPersistentState(dk('title'), dk('description'), dk('memo'), dk('tags'), dk('type'), dk('projectId'), dk('scheduledDate'), dk('scheduledTime'), dk('priority'), dk('recurrence'), dk('recurUntil'))
  const handleClose = () => { clearDraft(); onClose() }
  useEscapeClose(handleClose)
  const project = projects.find((item) => item.id === projectId)
  return <div className="modal-backdrop" onMouseDown={handleClose}><form className="modal glass-panel quest-modal" role="dialog" aria-modal="true" aria-labelledby="quest-modal-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); clearDraft(); onSave({ title: title.trim(), description: description.trim(), memo: memo.trim(), tags: tags.split(',').map((item) => item.trim()).filter(Boolean), type, projectId: projectId || undefined, project: project?.title, parentQuestId: quest?.parentQuestId, status: quest?.status ?? 'active', scheduledDate: scheduledDate || undefined, scheduledTime: scheduledTime || undefined, recurrenceRule: buildRecurrenceRule(recurrence, recurUntil || undefined), due: scheduledDate ? `${scheduledDate}${scheduledTime ? ` ${scheduledTime}` : ''}` : '일정 없음', done: quest?.done ?? false, priority, favorite: quest?.favorite ?? false }) }}><div className="modal-head"><div><span className="eyebrow">QUEST</span><h2 id="quest-modal-title">{quest ? '퀘스트 편집' : '새 퀘스트'}</h2></div><button type="button" onClick={handleClose} aria-label="닫기"><X size={18}/></button></div><label>제목<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} required/></label><label>상세 내용<textarea className="modal-textarea compact" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="무엇을 해야 하는지 간단히 적어 주세요."/></label><label>메모<textarea className="modal-textarea" value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="링크, 회의 내용, 떠오른 생각을 자유롭게 기록하세요."/></label><fieldset className="quest-type-field"><legend>유형</legend><label><input type="radio" checked={type === 'daily'} onChange={() => setType('daily')}/> 일일퀘스트</label><label><input type="radio" checked={type === 'sub'} onChange={() => setType('sub')}/> 서브퀘스트</label></fieldset><label>메인퀘스트 연결<select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">없음 · 독립 퀘스트</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><small>언제든 연결하거나 독립 퀘스트로 되돌릴 수 있어요.</small></label><div className="form-row"><label>마감일<input type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)}/></label><label>마감시간<input type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)}/></label></div><div className="form-row"><label>반복<select value={recurrence} onChange={(event) => setRecurrence(event.target.value)}><option value="">반복 안 함</option><option value="DAILY">매일</option><option value="WEEKLY">매주</option><option value="MONTHLY">매월</option></select></label>{recurrence && <label>반복 종료일<input type="date" min={scheduledDate} value={recurUntil} onChange={(event) => setRecurUntil(event.target.value || '')}/></label>}</div>{recurrence && <p className="quest-recur-note"><Repeat size={12}/> {recurrence === 'DAILY' ? '매일' : recurrence === 'WEEKLY' ? '매주 같은 요일' : '매월 같은 날짜'} 반복되며, 완료해도 다음 날 다시 나타납니다.</p>}<div className="form-row"><label>우선순위<select value={priority} onChange={(event) => setPriority(event.target.value as QuestPriority)}><option value="high">높음</option><option value="medium">보통</option><option value="low">낮음</option></select></label><label>태그<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="쉼표로 구분"/></label></div><div className="modal-actions"><button type="button" className="ghost" onClick={handleClose}>취소</button><button type="submit" className="primary"><Plus size={15}/>{quest ? '저장' : '추가'}</button></div></form></div>
}

function useEscapeClose(onClose: () => void) {
  useEffect(() => { const listener = (event: KeyboardEvent) => event.key === 'Escape' && onClose(); document.addEventListener('keydown', listener); return () => document.removeEventListener('keydown', listener) }, [onClose])
}

function isoToday() {
  return serviceDate()
}
function dateFromLegacyDue(due?: string) { const match = due?.match(/\d{4}-\d{2}-\d{2}/); return match?.[0] }
function timeFromDue(due?: string) { const match = due?.match(/\d{2}:\d{2}/); return match?.[0] }
function isTodayQuest(quest: Quest) {
  if (quest.recurrenceRule) return questOccursOn(quest, isoToday(), serviceDate(new Date(quest.createdAt)))
  return quest.scheduledDate === isoToday() || quest.due.startsWith('오늘')
}
function isThisWeekQuest(quest: Quest) {
  if (isTodayQuest(quest) || quest.due.startsWith('내일')) return true
  if (!quest.scheduledDate) return false
  const today = new Date(`${isoToday()}T00:00:00`)
  const date = new Date(`${quest.scheduledDate}T00:00:00`)
  const days = (date.getTime() - today.getTime()) / 86400000
  return days >= 0 && days <= 6
}
function recurrenceShort(rule?: string) {
  const frequency = parseRecurrenceRule(rule).frequency
  return frequency === 'DAILY' ? '매일' : frequency === 'WEEKLY' ? '매주' : frequency === 'MONTHLY' ? '매월' : ''
}
function questDueLabel(quest: Quest) {
  if (quest.scheduledDate === isoToday()) return `오늘${quest.scheduledTime ? ` ${quest.scheduledTime}` : ''}`
  return quest.due || '일정 없음'
}

const filterOptions: { id: QuestFilter; label: string }[] = [
  { id: 'all', label: '전체' }, { id: 'linked', label: '메인퀘스트 연결' }, { id: 'independent', label: '독립 퀘스트' }, { id: 'today', label: '오늘' }, { id: 'week', label: '이번 주' },
]
const statusLabel: Record<ProjectStatus, string> = { planned: '계획', active: '진행 중', completed: '완료', archived: '보관' }
const priorityLabel: Record<QuestPriority, string> = { high: '높음', medium: '보통', low: '낮음' }
