import { useState } from 'react'
import { Check, CheckSquare, Sparkles } from 'lucide-react'
import { format, isValid, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useNavigate, useParams } from 'react-router-dom'
import { BackButton } from '../../components/BackButton'
import { Pagination, usePaginatedList } from '../../components/Pagination'
import { useKingdomStore } from '../../store'
import { useServiceDate } from '../../lib/useServiceDate'
import { serviceDate } from '../../lib/serviceTime'
import { accountStorageKey } from '../../lib/accountScope'
import { clearPersistentState, usePersistentState } from '../../lib/usePersistentState'

export function DiaryPage() {
  const { date } = useParams()
  return <DiaryEditor key={date ?? 'today'}/>
}

function DiaryEditor() {
  const navigate = useNavigate()
  const { date: routeDate } = useParams()
  const today = useServiceDate()
  const parsedRoute = routeDate ? parseISO(routeDate) : null
  const routeValid = !routeDate || (parsedRoute && isValid(parsedRoute) && routeDate <= today)
  const initialDate = routeValid && routeDate ? routeDate : today
  const { diaries, quests, questCompletions, upsertDiary } = useKingdomStore()
  const existing = diaries.find((entry) => entry.date === initialDate)
  const entryDate = initialDate
  const dk = (field: string) => accountStorageKey(`draft-diary:${entryDate}:${field}`)
  const [saved, setSaved] = useState(false)
  const [title, setTitle] = usePersistentState(dk('title'), existing?.title ?? '')
  const [text, setText] = usePersistentState(dk('text'), existing?.content ?? '')
  const [mood, setMood] = usePersistentState(dk('mood'), existing?.mood ?? '평온')
  const [tags, setTags] = usePersistentState(dk('tags'), existing?.tags.join(', ') ?? '')
  const recurringCompletionIds = new Set(questCompletions.filter((item) => item.occurrenceDate === entryDate).map((item) => item.questId))
  const completedQuests = quests.filter((quest) => quest.type === 'daily' || quest.recurrenceRule
    ? recurringCompletionIds.has(quest.id)
    : quest.completedAt && serviceDate(new Date(quest.completedAt)) === entryDate)
  const [selectedQuestIds, setSelectedQuestIds] = useState(() => new Set(existing?.questSnapshots?.map((item) => item.sourceQuestId) ?? []))
  const snapshotOnly = (existing?.questSnapshots ?? []).filter((item) => !completedQuests.some((quest) => quest.id === item.sourceQuestId))
  const diaryQuestItems = [
    ...completedQuests.map((quest) => ({ sourceQuestId: quest.id, title: quest.title, note: quest.project ?? '독립 퀘스트' })),
    ...snapshotOnly.map((snapshot) => ({ sourceQuestId: snapshot.sourceQuestId, title: snapshot.title, note: snapshot.note || '보관된 퀘스트 기록' })),
  ]
  const questPage = usePaginatedList(diaryQuestItems, entryDate)
  const moods = [{ label: '평온', icon: '☁' }, { label: '기쁨', icon: '✦' }, { label: '피곤', icon: '☾' }, { label: '설렘', icon: '♡' }]
  const changeDate = (date: string) => { navigate(`/diary/${date}`, { replace: routeDate === undefined }) }
  const saveEntry = async () => {
    const currentIds = new Set(quests.map((quest) => quest.id))
    const preserved = (existing?.questSnapshots ?? []).filter((item) => selectedQuestIds.has(item.sourceQuestId) && !currentIds.has(item.sourceQuestId))
    const questSnapshots = [...preserved, ...completedQuests.filter((quest) => selectedQuestIds.has(quest.id)).map((quest) => ({ sourceQuestId: quest.id, title: quest.title, note: quest.project ?? '독립 퀘스트' }))]
    const id = await upsertDiary({ date: entryDate, title: title.trim(), content: text.trim(), mood, favorite: existing?.favorite ?? false, tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean), questSnapshots })
    if (id) clearPersistentState(dk('title'), dk('text'), dk('mood'), dk('tags'))
    setSaved(Boolean(id))
  }
  const date = parseISO(entryDate)
  if (!routeValid) return <div>{routeDate && <BackButton fallback="/diary"/>}<section className="diary-paper"><h2>올바르지 않은 날짜예요</h2><button onClick={() => navigate('/diary', { replace: true })}>오늘 기록으로 이동</button></section></div>
  return <div>{routeDate && <BackButton fallback="/diary" label="침실로"/>}<div className="diary-layout"><aside className="panel glass-panel diary-controls"><label>기록 날짜<input type="date" value={entryDate} max={today} onChange={(event) => changeDate(event.target.value)}/></label><button onClick={() => changeDate(today)}>오늘로 돌아가기</button><div className="mood"><span>오늘의 마음</span><div>{moods.map((item) => <button key={item.label} aria-pressed={mood === item.label} className={mood === item.label ? 'active' : ''} onClick={() => { setMood(item.label); setSaved(false) }}>{item.icon}<small>{item.label}</small></button>)}</div></div><label>태그<input value={tags} onChange={(event) => { setTags(event.target.value); setSaved(false) }} placeholder="쉼표로 구분"/></label></aside><section className="diary-paper parchment-panel"><div className="paper-date"><span>{format(date, 'MMMM', { locale: ko }).toUpperCase()}</span><b>{format(date, 'dd')}</b><small>{format(date, 'EEEE · yyyy', { locale: ko })}</small></div><input className="diary-title" value={title} onChange={(event) => { setTitle(event.target.value); setSaved(false) }} placeholder="오늘의 제목" aria-label="다이어리 제목"/><textarea value={text} onChange={(event) => { setText(event.target.value); setSaved(false) }} placeholder="오늘의 마음과 기억을 적어 보세요." aria-label="다이어리 본문"/>{diaryQuestItems.length > 0 && <section className="diary-quest-import"><header><CheckSquare size={16}/><div><b>완료한 퀘스트</b><small>이날 완료한 일을 다이어리에 함께 보관하세요.</small></div></header>{questPage.visibleItems.map((item) => <label key={item.sourceQuestId}><input type="checkbox" checked={selectedQuestIds.has(item.sourceQuestId)} onChange={(event) => { const next = new Set(selectedQuestIds); if (event.target.checked) next.add(item.sourceQuestId); else next.delete(item.sourceQuestId); setSelectedQuestIds(next); setSaved(false) }}/><span><b>{item.title}</b><small>{item.note}</small></span></label>)}<Pagination page={questPage.page} totalItems={questPage.totalItems} onPageChange={questPage.setPage} label="완료한 퀘스트"/></section>}<div className="diary-summary"><Sparkles size={16}/><p><b>리타가 정리할 오늘</b>{text ? '기록을 저장하면 리타가 오늘의 흐름을 요약할 수 있어요.' : '조금이라도 마음에 남은 일을 적어 보세요.'}</p></div><button className="save-diary" onClick={() => void saveEntry()} disabled={!title.trim() && !text.trim()}>{saved ? <><Check size={16}/>저장되었습니다</> : <>오늘의 기록 저장</>}</button></section></div></div>
}
