import { BookOpen, ChevronRight, Pencil, Search, Star, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BackButton } from '../../components/BackButton'
import { EmptyState, SectionTitle } from '../../components/Common'
import { projectProgress, useKingdomStore } from '../../store'
import type { LibraryCategory, LibraryRecord, ProjectStatus, QuestPriority, QuestStatus } from '../../types'
import { buildLibraryRecords, libraryCategories, recordMatchesCategory, recordPath } from './libraryData'

function useLibraryRecords() {
  const { projects, quests, relationships, memos, diaries } = useKingdomStore()
  return useMemo(() => buildLibraryRecords({ projects, quests, relationships, memos, diaries }), [diaries, memos, projects, quests, relationships])
}

export function LibraryPage() {
  const navigate = useNavigate()
  const records = useLibraryRecords()
  const recent = [...records].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4)
  return <div>
    <div className="library-intro panel glass-panel"><BookOpen size={20}/><p>책을 펼치면 왕국의 모든 기록을 검색하고 정리할 수 있어요.</p></div>
    <div className="library-book-grid">{libraryCategories.map((category) => {
      const count = records.filter((record) => recordMatchesCategory(record, category.id)).length
      return <button className="library-book" key={category.id} onClick={() => navigate(`/library/${category.id}`)}><span className="book-cover-frame"><img src={category.image} alt={`${category.title} 책 표지`} loading="lazy"/></span><span className="book-meta"><b>{category.title}</b><small>{category.description}</small><em>{count}개의 기록 <ChevronRight size={13}/></em></span></button>
    })}</div>
    <section className="panel glass-panel recent-records"><SectionTitle title="최근 수정한 기록" action="전체보기" onAction={() => navigate('/library/all')}/>{recent.length ? recent.map((record) => <button className="record-row record-row-button" key={record.id} onClick={() => navigate(recordPath(record))}><span className="record-icon"><BookOpen size={16}/></span><div><b>{record.title}</b><small>{typeLabel[record.type]} · {new Date(record.updatedAt).toLocaleDateString('ko-KR')}</small></div><span>{record.tags[0] ?? '기록'}</span><ChevronRight size={17}/></button>) : <EmptyState title="아직 보관된 기록이 없어요"/>}</section>
  </div>
}

export function LibraryCategoryPage() {
  const { category = 'all' } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const records = useLibraryRecords()
  const store = useKingdomStore()
  const valid = libraryCategories.some((item) => item.id === category)
  const selectedCategory = (valid ? category : 'all') as LibraryCategory
  const config = libraryCategories.find((item) => item.id === selectedCategory) ?? libraryCategories[0]
  const query = params.get('q') ?? ''
  const tag = params.get('tag') ?? ''
  const sort = params.get('sort') ?? 'updated'
  const favoritesOnly = params.get('favorite') === '1'
  const scoped = records.filter((record) => recordMatchesCategory(record, selectedCategory))
  const tags = Array.from(new Set(scoped.flatMap((record) => record.tags))).filter(Boolean)
  const visible = scoped.filter((record) => {
    const haystack = record.searchText || `${record.title} ${record.summary} ${record.tags.join(' ')}`
    return (!query || haystack.toLocaleLowerCase('ko').includes(query.toLocaleLowerCase('ko'))) && (!tag || record.tags.includes(tag)) && (!favoritesOnly || record.favorite)
  }).sort((a, b) => sortRecords(a, b, sort))
  const updateParam = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next, { replace: true }) }
  const remove = (record: LibraryRecord) => {
    if (!confirm(`“${record.title}” 기록을 삭제할까요?`)) return
    if (record.type === 'mainQuest') store.deleteProject(record.sourceId)
    else if (record.type === 'dailyQuest' || record.type === 'subQuest') store.deleteQuest(record.sourceId)
    else if (record.type === 'relationship') store.deleteRelationship(record.sourceId)
    else if (record.type === 'memo') store.deleteMemo(record.sourceId)
    else store.deleteDiary(record.sourceId)
  }
  if (!valid) return <div><BackButton fallback="/library"/><section className="panel glass-panel"><EmptyState title="존재하지 않는 서고예요" action="도서관으로 이동" onAction={() => navigate('/library', { replace: true })}/></section></div>
  return <div>
    <BackButton fallback="/library" label="도서관으로"/>
    <section className="library-category-head panel glass-panel"><img src={config.image} alt=""/><div><span className="eyebrow">ROYAL ARCHIVE</span><h2>{config.title}</h2><p>{config.description} · {scoped.length}개의 기록</p></div></section>
    <section className="library-tools panel glass-panel"><label><Search size={17}/><input value={query} onChange={(event) => updateParam('q', event.target.value)} placeholder="제목, 상세 내용, 메모, 태그 검색" aria-label="기록 검색"/></label><select value={tag} onChange={(event) => updateParam('tag', event.target.value)} aria-label="태그 필터"><option value="">모든 태그</option>{tags.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={sort} onChange={(event) => updateParam('sort', event.target.value)} aria-label="정렬"><option value="updated">최근 수정순</option><option value="newest">최신순</option><option value="oldest">오래된순</option><option value="name">이름순</option></select><button className={favoritesOnly ? 'active' : ''} onClick={() => updateParam('favorite', favoritesOnly ? '' : '1')}><Star size={15}/> 즐겨찾기</button>{selectedCategory === 'relationships' && <button className="primary" onClick={() => navigate('/library/relationships/new')}>새 인연</button>}{selectedCategory === 'memos' && <button className="primary" onClick={() => navigate('/library/memos/new')}>새 메모</button>}</section>
    <section className="library-record-list panel glass-panel">{visible.length ? visible.map((record) => <article key={record.id}><button className="record-main" onClick={() => navigate(recordPath(record))}><span className="record-type">{typeLabel[record.type]}</span><span><b>{record.title}</b><small>{record.summary}</small><em>{record.tags.join(' · ') || '태그 없음'}</em></span><ChevronRight size={17}/></button><button className={record.favorite ? 'favorite active' : 'favorite'} aria-label={`${record.title} 즐겨찾기`} onClick={() => store.toggleLibraryFavorite(record.type, record.sourceId)}><Star size={16} fill={record.favorite ? 'currentColor' : 'none'}/></button><button aria-label={`${record.title} 열기`} onClick={() => navigate(recordPath(record))}><Pencil size={16}/></button><button className="danger-icon" aria-label={`${record.title} 삭제`} onClick={() => remove(record)}><Trash2 size={16}/></button></article>) : <EmptyState title="조건에 맞는 기록이 없어요" description="검색어나 필터를 바꿔 보세요."/>}</section>
  </div>
}

export function LibraryItemPage() {
  const { itemId = '' } = useParams()
  const navigate = useNavigate()
  const records = useLibraryRecords()
  const { projects, quests, updateQuest, updateProject } = useKingdomStore()
  const record = records.find((item) => item.id === decodeURIComponent(itemId))
  const quest = quests.find((item) => item.id === record?.sourceId)
  const project = projects.find((item) => item.id === record?.sourceId)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(quest?.title ?? project?.title ?? '')
  const [description, setDescription] = useState(quest?.description ?? project?.description ?? '')
  const [memo, setMemo] = useState(quest?.memo ?? project?.memo ?? '')
  const [tags, setTags] = useState((quest?.tags ?? project?.tags ?? []).join(', '))
  const [projectId, setProjectId] = useState(quest?.projectId ?? '')
  const [scheduledDate, setScheduledDate] = useState(quest?.scheduledDate ?? '')
  const [scheduledTime, setScheduledTime] = useState(quest?.scheduledTime ?? '')
  const [priority, setPriority] = useState<QuestPriority>(quest?.priority ?? 'medium')
  const [questStatus, setQuestStatus] = useState<QuestStatus>(quest?.status ?? 'active')
  const [goal, setGoal] = useState(project?.goal ?? '')
  const [startDate, setStartDate] = useState(project?.startDate ?? '')
  const [due, setDue] = useState(project?.due ?? '')
  const [tag, setTag] = useState(project?.tag ?? 'Project')
  if (!record) return <div><BackButton fallback="/library/all"/><section className="panel glass-panel"><EmptyState title="기록을 찾을 수 없어요" action="전체 기록 보기" onAction={() => navigate('/library/all', { replace: true })}/></section></div>
  const fallback = record.type === 'mainQuest' ? '/library/main-quests' : record.type === 'dailyQuest' ? '/library/daily-quests' : '/library/sub-quests'
  const save = () => {
    const parsedTags = tags.split(',').map((item) => item.trim()).filter(Boolean)
    if (quest && title.trim()) {
      const linkedProject = projects.find((item) => item.id === projectId)
      updateQuest(quest.id, { title: title.trim(), description: description.trim(), memo: memo.trim(), tags: parsedTags, projectId: projectId || undefined, project: linkedProject?.title, scheduledDate: scheduledDate || undefined, scheduledTime: scheduledTime || undefined, due: scheduledDate ? `${scheduledDate}${scheduledTime ? ` ${scheduledTime}` : ''}` : '일정 없음', priority, status: questStatus, done: questStatus === 'completed' })
    }
    if (project && title.trim()) updateProject(project.id, { title: title.trim(), goal: goal.trim(), description: description.trim(), memo: memo.trim(), tags: parsedTags, startDate, due, tag: tag.trim() || 'Project' })
    setEditing(false)
  }
  return <div>
    <BackButton fallback={fallback} label={`${typeLabel[record.type]} 목록으로`}/>
    <article className="archive-detail archive-document panel glass-panel parchment-panel">
      <header className="archive-document-head"><div><span className="eyebrow">{typeLabel[record.type]}</span><h2>{record.title}</h2><p>{quest ? statusLabel[quest.status] : project ? projectStatusLabel[project.status] : ''}</p></div>{!editing && <button className="archive-edit-button" onClick={() => setEditing(true)}><Pencil size={15}/> 기록 편집</button>}</header>
      <div className="royal-divider"><i/><span>✦</span><i/></div>
      {editing ? <div className="record-form archive-edit-form">
        <label>제목<input value={title} onChange={(event) => setTitle(event.target.value)}/></label>
        {project && <label>목표<input value={goal} onChange={(event) => setGoal(event.target.value)}/></label>}
        <label>{project ? '짧은 설명' : '상세 내용'}<textarea className="compact" value={description} onChange={(event) => setDescription(event.target.value)}/></label>
        <label>메모<textarea value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="링크, 회의 내용, 떠오른 생각을 자유롭게 기록하세요."/></label>
        {quest && <><div className="form-row"><label>메인퀘스트 연결<select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">없음 · 독립 퀘스트</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label>상태<select value={questStatus} onChange={(event) => setQuestStatus(event.target.value as QuestStatus)}><option value="planned">계획</option><option value="active">진행 중</option><option value="completed">완료</option></select></label></div><div className="form-row"><label>마감일<input type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)}/></label><label>마감시간<input type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)}/></label></div><label>우선순위<select value={priority} onChange={(event) => setPriority(event.target.value as QuestPriority)}><option value="high">높음</option><option value="medium">보통</option><option value="low">낮음</option></select></label></>}
        {project && <><div className="form-row"><label>시작일<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)}/></label><label>마감일<input type="date" value={due} onChange={(event) => setDue(event.target.value)}/></label></div><label>대표 태그<input value={tag} onChange={(event) => setTag(event.target.value)}/></label></>}
        <label>태그<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="쉼표로 구분"/></label>
        <div className="detail-footer-actions"><button className="primary" onClick={save}>저장</button><button onClick={() => setEditing(false)}>취소</button></div>
      </div> : <ArchiveReadView record={record} quest={quest} project={project} projects={projects} quests={quests}/>} 
    </article>
  </div>
}

function ArchiveReadView({ record, quest, project, projects, quests }: { record: LibraryRecord; quest?: ReturnType<typeof useKingdomStore.getState>['quests'][number]; project?: ReturnType<typeof useKingdomStore.getState>['projects'][number]; projects: ReturnType<typeof useKingdomStore.getState>['projects']; quests: ReturnType<typeof useKingdomStore.getState>['quests'] }) {
  const linkedProject = projects.find((item) => item.id === quest?.projectId)
  return <div className="archive-document-body">
    {project && <ArchiveSection title="목표" content={project.goal}/>} 
    <ArchiveSection title={project ? '짧은 설명' : '상세 내용'} content={project?.description ?? quest?.description}/>
    <ArchiveSection title="메모" content={project?.memo ?? quest?.memo}/>
    <dl className="archive-meta-grid">
      {quest && <><div><dt>메인퀘스트</dt><dd>{linkedProject?.title ?? '독립 퀘스트'}</dd></div><div><dt>마감</dt><dd>{quest.scheduledDate || '일정 없음'}{quest.scheduledTime ? ` · ${quest.scheduledTime}` : ''}</dd></div><div><dt>우선순위</dt><dd>{priorityLabel[quest.priority]}</dd></div><div><dt>상태</dt><dd>{statusLabel[quest.status]}</dd></div></>}
      {project && <><div><dt>기간</dt><dd>{project.startDate} — {project.due}</dd></div><div><dt>진행률</dt><dd>{projectProgress(project, quests)}%</dd></div><div><dt>대표 태그</dt><dd>{project.tag}</dd></div><div><dt>상태</dt><dd>{projectStatusLabel[project.status]}</dd></div></>}
      <div><dt>생성일</dt><dd>{new Date(record.createdAt).toLocaleString('ko-KR')}</dd></div><div><dt>수정일</dt><dd>{new Date(record.updatedAt).toLocaleString('ko-KR')}</dd></div>
    </dl>
    <div className="detail-tags">{record.tags.length ? record.tags.map((item) => <span key={item}>{item}</span>) : <span>태그 없음</span>}</div>
  </div>
}

function ArchiveSection({ title, content }: { title: string; content?: string }) { return <section className="archive-text-section"><h3>{title}</h3><p>{content?.trim() || '아직 기록된 내용이 없습니다.'}</p></section> }

const typeLabel: Record<LibraryRecord['type'], string> = { mainQuest: '메인퀘스트', dailyQuest: '일일퀘스트', subQuest: '서브퀘스트', relationship: '인연록', memo: '비망록', diary: '다이어리' }
const priorityLabel: Record<QuestPriority, string> = { high: '높음', medium: '보통', low: '낮음' }
const statusLabel: Record<QuestStatus, string> = { planned: '계획', active: '진행 중', completed: '완료' }
const projectStatusLabel: Record<ProjectStatus, string> = { planned: '계획', active: '진행 중', completed: '완료', archived: '보관' }
function sortRecords(a: LibraryRecord, b: LibraryRecord, sort: string) { if (sort === 'newest') return b.createdAt.localeCompare(a.createdAt); if (sort === 'oldest') return a.createdAt.localeCompare(b.createdAt); if (sort === 'name') return a.title.localeCompare(b.title, 'ko'); return b.updatedAt.localeCompare(a.updatedAt) }
