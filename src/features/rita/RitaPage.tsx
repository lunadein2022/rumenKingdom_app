import { useEffect, useRef, useState } from 'react'
import { Check, CirclePlus, FileText, Image as ImageIcon, LoaderCircle, Music, Send, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { RitaFace, type RitaExpression } from '../../components/RitaFace'
import { analyzeRitaAttachment, interpretRitaRequest, type AttachmentIntent, type RitaAttachmentAnalysis, type RitaRequestAnalysis } from '../../services/ritaService'
import { calendarKinds, useKingdomStore } from '../../store'
import type { CalendarKind, Project, QuestPriority, QuestType } from '../../types'
import { accountStorageKey } from '../../lib/accountScope'

type ChatMessage = { from: 'rita' | 'user'; text: string; expression?: RitaExpression }
type MemoDraft = { kind: 'memo'; title: string; content: string; tags: string[] }
type ProjectDraft = Extract<RitaRequestAnalysis, { kind: 'project' }>
type QuestDraft = Extract<RitaRequestAnalysis, { kind: 'quest' }>
type CalendarDraft = Extract<RitaRequestAnalysis, { kind: 'calendar' }>
type Draft = MemoDraft | ProjectDraft | QuestDraft | CalendarDraft | RitaAttachmentAnalysis

const welcomeMessage: ChatMessage = {
  from: 'rita',
  text: '공주님을 기다리고 있었어요. 오늘은 무엇을 정리해 드릴까요?',
  expression: 'welcome',
}

export function RitaPage({ demoMode = false }: { demoMode?: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const fileInput = useRef<HTMLInputElement>(null)
  const { projects, addProject, addQuest, addEvent } = useKingdomStore()
  const conversationStorageKey = accountStorageKey('rumen-rita-conversation')
  const prompt = (location.state as { prompt?: string } | null)?.prompt
  const [input, setInput] = useState(prompt ?? '')
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [savedAction, setSavedAction] = useState<{ path: string; label: string } | null>(null)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(conversationStorageKey) ?? 'null') as ChatMessage[] || [welcomeMessage]
    } catch { return [welcomeMessage] }
  })

  useEffect(() => { localStorage.setItem(conversationStorageKey, JSON.stringify(messages.slice(-40))) }, [conversationStorageKey, messages])
  useEffect(() => { if (prompt) navigate('/rita', { replace: true, state: null }) }, [navigate, prompt])
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const selectFile = (file?: File) => {
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      setMessages((current) => [...current, { from: 'rita', text: '현재는 4MB 이하의 파일만 읽을 수 있어요.', expression: 'concern' }])
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setAttachment(file)
    setPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
    setDraft(null)
  }

  const removeAttachment = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setAttachment(null)
    if (fileInput.current) fileInput.current.value = ''
  }

  const submit = async () => {
    if (loading) return
    if (demoMode) {
      setMessages((current) => [...current, { from: 'rita', text: '데모 왕국에서는 예시 화면만 체험할 수 있어요. AI 대화와 파일 분석은 왕국 계정으로 로그인한 뒤 이용해 주세요.', expression: 'concern' }])
      return
    }
    if (attachment) {
      const intent = attachmentIntent(attachment)
      const requestText = input.trim() || attachmentRequest(intent, attachment.name)
      setMessages((current) => [...current, { from: 'user', text: requestText }])
      setInput('')
      setLoading(true)
      try {
        const result = await analyzeRitaAttachment(attachment, intent)
        setDraft(result)
        setMessages((current) => [...current, {
          from: 'rita',
          text: result.kind === 'business-card'
            ? `${result.name}님의 명함을 읽어 인연록 초안으로 정리했어요. 내용을 확인해 주세요.`
            : `파일을 읽고 비망록 초안으로 요약했어요. 저장 전에 내용을 확인해 주세요.`,
          expression: 'speaking',
        }])
      } catch (error) {
        setMessages((current) => [...current, { from: 'rita', text: error instanceof Error ? error.message : '파일을 읽지 못했어요.', expression: 'error' }])
      } finally { setLoading(false) }
      return
    }

    const value = input.trim()
    if (!value) return
    const userMessage: ChatMessage = { from: 'user', text: value }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    setSavedAction(null)
    if (/(메모해\s*줘|메모해줘|비망록에|기록해\s*줘)/.test(value)) {
      const content = value.replace(/리타[야아]?[,\s]*/g, '').replace(/(이거|이 내용)?\s*(메모해\s*줘|비망록에\s*(적어|저장해)\s*줘|기록해\s*줘)/g, '').trim() || value
      setDraft({ kind: 'memo', title: content.length > 26 ? `${content.slice(0, 26)}…` : content, content, tags: inferTags(content) })
      setMessages((current) => [...current, { from: 'rita', text: '비망록에 저장할 초안을 정리했어요. 내용을 확인해 주세요.', expression: 'speaking' }])
      return
    }
    setLoading(true)
    try {
      const analysis = await interpretRitaRequest(
        nextMessages.map((message) => ({ role: message.from === 'rita' ? 'assistant' : 'user', content: message.text })),
        projects.filter((project) => project.status !== 'completed' && project.status !== 'archived').map(({ id, title, status }) => ({ id, title, status })),
      )
      if (analysis.kind === 'quest' || analysis.kind === 'calendar' || analysis.kind === 'project') {
        setDraft(analysis)
        setMessages((current) => [...current, { from: 'rita', text: analysis.reply, expression: 'speaking' }])
      } else if (analysis.kind === 'memo') {
        setDraft(analysis)
        setMessages((current) => [...current, { from: 'rita', text: '비망록에 저장할 초안을 정리했어요. 내용을 확인해 주세요.', expression: 'speaking' }])
      } else {
        setMessages((current) => [...current, { from: 'rita', text: analysis.reply, expression: analysis.kind === 'clarify' ? 'concern' : 'speaking' }])
      }
    } catch (error) {
      setMessages((current) => [...current, { from: 'rita', text: error instanceof Error ? error.message : '지금은 왕실 통신망이 불안정해요.', expression: 'error' }])
    } finally { setLoading(false) }
  }

  const confirmDraft = async () => {
    if (!draft) return
    if (draft.kind === 'business-card') {
      navigate('/library/relationships/new', { state: { draft } })
    } else if (draft.kind === 'memorandum') {
      navigate('/library/memos/new', { state: { draft: {
        title: draft.title,
        content: draft.summary,
        tags: draft.tags,
        transcript: draft.transcript,
        sourceAttachment: draft.attachment,
      } } })
    } else if (draft.kind === 'memo') {
      navigate('/library/memos/new', { state: { draft: { title: draft.title, content: draft.content, tags: draft.tags } } })
    } else if (draft.kind === 'project') {
      addProject({
        title: draft.title,
        goal: draft.goal,
        description: draft.description,
        memo: '',
        tags: draft.tags,
        progress: 0,
        startDate: draft.startDate ?? '',
        due: draft.dueDate ?? '',
        tag: draft.tags[0] ?? 'Project',
        status: 'active',
        priority: draft.priority,
        favorite: false,
      })
      setDraft(null)
      setSavedAction({ path: '/office', label: '집무실에서 보기' })
      setMessages((current) => [...current, { from: 'rita', text: `“${draft.title}” 메인퀘스트를 추가했어요.`, expression: 'celebration' }])
    } else if (draft.kind === 'quest') {
      if (draft.needsProjectSelection && !draft.projectId) {
        setMessages((current) => [...current, { from: 'rita', text: '연결할 메인퀘스트를 선택하거나 독립 퀘스트를 선택해 주세요.', expression: 'concern' }])
        return
      }
      const project = projects.find((item) => item.id === draft.projectId)
      addQuest({
        title: draft.title,
        description: draft.description,
        memo: '',
        tags: draft.tags,
        type: draft.questType,
        projectId: project?.id,
        project: project?.title,
        status: 'active',
        scheduledDate: draft.dueDate,
        scheduledTime: draft.dueTime,
        due: draft.dueDate ? `${draft.dueDate}${draft.dueTime ? ` ${draft.dueTime}` : ''}` : '일정 없음',
        done: false,
        priority: draft.priority,
        favorite: false,
      })
      setDraft(null)
      setSavedAction({ path: '/office', label: '집무실에서 보기' })
      setMessages((current) => [...current, { from: 'rita', text: `${project ? `${project.title}에 연결된 ` : '독립 '}${draft.questType === 'sub' ? '서브퀘스트' : '일일퀘스트'}로 추가했어요.`, expression: 'celebration' }])
    } else if (draft.kind === 'calendar') {
      setLoading(true)
      try {
        const saved = await addEvent({
          title: draft.title,
          description: draft.description,
          date: draft.startDate,
          endDate: draft.endDate,
          start: draft.allDay ? '' : draft.startTime ?? '09:00',
          end: draft.allDay ? undefined : draft.endTime,
          allDay: draft.allDay,
          kind: draft.calendarKind,
          important: draft.important,
        })
        setDraft(null)
        setSavedAction({ path: `/calendar/event/${saved.event.id}`, label: '왕실 일정표에서 보기' })
        setMessages((current) => [...current, { from: 'rita', text: saved.storage === 'cloud' ? '왕실 일정표에 저장했어요.' : '이 기기의 왕실 일정표에 저장했어요.', expression: 'celebration' }])
      } catch {
        setMessages((current) => [...current, { from: 'rita', text: '일정을 저장하지 못했어요. 내용을 유지해 두었으니 다시 시도해 주세요.', expression: 'error' }])
      } finally { setLoading(false) }
    }
  }

  return <div className="rita-layout">
    <aside className="rita-portrait glass-panel"><div className="portrait-halo"/><img className="rita-full-character" src="/assets/characters/rita-full.webp" alt="왕실 메이드 리타"/><div className="rita-portrait-copy"><small>ROYAL MAID</small><h2>리타</h2><p>공주님의 하루가 조금 더 가벼워지도록 곁에서 정리해 드릴게요.</p></div></aside>
    <section className="chat glass-panel" aria-busy={loading}>
      <div className="chat-head"><div><span className="online"/><b>왕실 메이드 리타</b><small>{loading ? '자료를 읽고 정리하고 있어요' : '언제나 곁에 있어요'}</small></div><button className="chat-clear" onClick={() => { setMessages([welcomeMessage]); setDraft(null); removeAttachment() }}>대화 지우기</button></div>
      {demoMode && <div className="rita-demo-notice">데모 모드에서는 리타의 화면만 미리 볼 수 있어요. 실제 대화와 첨부 분석은 로그인이 필요합니다.</div>}
      <div className="messages" aria-live="polite">
        {messages.map((message, index) => <div key={index} className={`message ${message.from}`}>{message.from === 'rita' ? <RitaFace expression={message.expression}/> : <img className="princess-message-avatar" src="/assets/characters/princess-bust.webp" alt="공주"/>}<p>{message.text}</p></div>)}
        {draft && <DraftConfirmation
          draft={draft}
          projects={projects.filter((project) => project.status !== 'completed' && project.status !== 'archived')}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onConfirm={() => void confirmDraft()}
        />}
        {savedAction && <button className="rita-saved-action" onClick={() => navigate(savedAction.path)}><Check size={15}/>{savedAction.label}</button>}
        {loading && <div className="message rita typing"><RitaFace expression="thinking"/><p><i/><i/><i/></p></div>}
      </div>
      <div className="suggestions">{['오늘 일정 정리해줘', '메인퀘스트 요약해줘', '이 내용을 비망록에 메모해줘'].map((value) => <button key={value} onClick={() => setInput(value)}>{value}</button>)}</div>
      {attachment && <AttachmentTray file={attachment} previewUrl={previewUrl} loading={loading} onRemove={removeAttachment}/>} 
      <div className="composer">
        <input ref={fileInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif,.pdf,.docx,.txt,.md,.csv,audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/m4a,audio/ogg" onChange={(event) => selectFile(event.target.files?.[0])}/>
        <button aria-label="파일 첨부" title="명함, 문서 또는 음성 첨부" onClick={() => fileInput.current?.click()}><CirclePlus size={19}/></button>
        <input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && !event.nativeEvent.isComposing && void submit()} placeholder={attachment ? '파일과 함께 전할 말을 적어 주세요…' : '리타에게 말해 주세요…'}/>
        <button className="send" onClick={() => void submit()} disabled={loading || (!input.trim() && !attachment)} aria-label="보내기"><Send size={17}/></button>
      </div>
    </section>
  </div>
}

function AttachmentTray({ file, previewUrl, loading, onRemove }: { file: File; previewUrl: string | null; loading: boolean; onRemove: () => void }) {
  const intent = attachmentIntent(file)
  const Icon = intent === 'business-card' ? ImageIcon : intent === 'audio' ? Music : FileText
  return <div className="attachment-tray">
    {previewUrl ? <img src={previewUrl} alt="첨부한 명함 미리보기"/> : <span className={`attachment-kind ${intent}`}><Icon size={20}/></span>}
    <div><b>{file.name}</b><small>{intent === 'business-card' ? '명함 → 인연록 초안' : intent === 'audio' ? '음성 → 전사 후 비망록 초안' : '문서 → 요약 후 비망록 초안'} · {formatBytes(file.size)}</small></div>
    {loading ? <LoaderCircle className="attachment-spinner" size={18}/> : <button aria-label="첨부 취소" onClick={onRemove}><X size={16}/></button>}
  </div>
}

function DraftConfirmation({ draft, projects, onChange, onClose, onConfirm }: { draft: Draft; projects: Project[]; onChange: (draft: Draft) => void; onClose: () => void; onConfirm: () => void }) {
  if (draft.kind === 'project') return <ProjectDraftConfirmation draft={draft} onChange={onChange} onClose={onClose} onConfirm={onConfirm}/>
  if (draft.kind === 'quest') return <QuestDraftConfirmation draft={draft} projects={projects} onChange={onChange} onClose={onClose} onConfirm={onConfirm}/>
  if (draft.kind === 'calendar') return <CalendarDraftConfirmation draft={draft} onChange={onChange} onClose={onClose} onConfirm={onConfirm}/>
  const businessCard = draft.kind === 'business-card'
  const title = businessCard ? draft.name : draft.title
  const content = businessCard
    ? [draft.organization, draft.position, draft.phone, draft.email].filter(Boolean).join(' · ')
    : draft.kind === 'memorandum' ? draft.summary : draft.content
  const tags = draft.tags
  return <article className="rita-confirmation">
    <div><span>{businessCard ? 'RELATIONSHIP DRAFT' : 'MEMORANDUM DRAFT'}</span><button aria-label="초안 닫기" onClick={onClose}><X size={14}/></button></div>
    <h3>{title}</h3><p>{content}</p><small>{tags.join(' · ') || '태그 없음'}</small>
    <button onClick={onConfirm}><Check size={15}/> {businessCard ? '인연록에서 확인하고 저장' : '비망록에서 확인하고 저장'}</button>
  </article>
}

function ProjectDraftConfirmation({ draft, onChange, onClose, onConfirm }: { draft: ProjectDraft; onChange: (draft: Draft) => void; onClose: () => void; onConfirm: () => void }) {
  const update = (change: Partial<ProjectDraft>) => onChange({ ...draft, ...change })
  return <article className="rita-confirmation rita-action-draft">
    <div><span>MAIN QUEST DRAFT</span><button aria-label="초안 닫기" onClick={onClose}><X size={14}/></button></div>
    <label>제목<input value={draft.title} onChange={(event) => update({ title: event.target.value })}/></label>
    <label>목표<input value={draft.goal} onChange={(event) => update({ goal: event.target.value })} placeholder="이 메인퀘스트로 이루고 싶은 목표"/></label>
    <label>상세 내용<textarea value={draft.description} onChange={(event) => update({ description: event.target.value })}/></label>
    <div className="rita-draft-row">
      <label>시작일<input type="date" value={draft.startDate ?? ''} onChange={(event) => update({ startDate: event.target.value || undefined })}/></label>
      <label>마감일<input type="date" min={draft.startDate} value={draft.dueDate ?? ''} onChange={(event) => update({ dueDate: event.target.value || undefined })}/></label>
    </div>
    <label>우선순위<select value={draft.priority} onChange={(event) => update({ priority: event.target.value as QuestPriority })}><option value="high">높음</option><option value="medium">보통</option><option value="low">낮음</option></select></label>
    <button disabled={!draft.title.trim()} onClick={onConfirm}><Check size={15}/> 메인퀘스트 추가</button>
  </article>
}

function QuestDraftConfirmation({ draft, projects, onChange, onClose, onConfirm }: { draft: QuestDraft; projects: Project[]; onChange: (draft: Draft) => void; onClose: () => void; onConfirm: () => void }) {
  const update = (change: Partial<QuestDraft>) => onChange({ ...draft, ...change })
  return <article className="rita-confirmation rita-action-draft">
    <div><span>QUEST DRAFT</span><button aria-label="초안 닫기" onClick={onClose}><X size={14}/></button></div>
    <label>제목<input value={draft.title} onChange={(event) => update({ title: event.target.value })}/></label>
    <label>상세 내용<textarea value={draft.description} onChange={(event) => update({ description: event.target.value })}/></label>
    <div className="rita-draft-row">
      <label>유형<select value={draft.questType} onChange={(event) => update({ questType: event.target.value as QuestType })}><option value="daily">일일퀘스트</option><option value="sub">서브퀘스트</option></select></label>
      <label>우선순위<select value={draft.priority} onChange={(event) => update({ priority: event.target.value as QuestPriority })}><option value="high">높음</option><option value="medium">보통</option><option value="low">낮음</option></select></label>
    </div>
    <label>메인퀘스트 연결<select value={draft.needsProjectSelection ? '__select__' : draft.projectId ?? ''} onChange={(event) => update({ projectId: event.target.value || undefined, needsProjectSelection: false })}>{draft.needsProjectSelection && <option value="__select__" disabled>연결 대상을 선택하세요</option>}<option value="">독립 퀘스트</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
    {draft.needsProjectSelection && <small className="draft-warning">연결할 메인퀘스트를 선택해 주세요.</small>}
    <div className="rita-draft-row"><label>마감일<input type="date" value={draft.dueDate ?? ''} onChange={(event) => update({ dueDate: event.target.value || undefined })}/></label><label>마감시간<input type="time" value={draft.dueTime ?? ''} onChange={(event) => update({ dueTime: event.target.value || undefined })}/></label></div>
    <button disabled={!draft.title.trim()} onClick={onConfirm}><Check size={15}/> 퀘스트 추가</button>
  </article>
}

function CalendarDraftConfirmation({ draft, onChange, onClose, onConfirm }: { draft: CalendarDraft; onChange: (draft: Draft) => void; onClose: () => void; onConfirm: () => void }) {
  const update = (change: Partial<CalendarDraft>) => onChange({ ...draft, ...change })
  return <article className="rita-confirmation rita-action-draft">
    <div><span>SCHEDULE DRAFT</span><button aria-label="초안 닫기" onClick={onClose}><X size={14}/></button></div>
    <label>일정 이름<input value={draft.title} onChange={(event) => update({ title: event.target.value })}/></label>
    <label>설명<textarea value={draft.description} onChange={(event) => update({ description: event.target.value })}/></label>
    <div className="rita-draft-row"><label>시작일<input type="date" value={draft.startDate} onChange={(event) => update({ startDate: event.target.value })}/></label><label>종료일<input type="date" min={draft.startDate} value={draft.endDate ?? draft.startDate} onChange={(event) => update({ endDate: event.target.value || undefined })}/></label></div>
    <label className="rita-inline-check"><input type="checkbox" checked={draft.allDay} onChange={(event) => update({ allDay: event.target.checked })}/> 종일 일정</label>
    {!draft.allDay && <div className="rita-draft-row"><label>시작시간<input type="time" value={draft.startTime ?? ''} onChange={(event) => update({ startTime: event.target.value || undefined })}/></label><label>종료시간<input type="time" min={draft.startTime} value={draft.endTime ?? ''} onChange={(event) => update({ endTime: event.target.value || undefined })}/></label></div>}
    <label>일정 분류<select value={draft.calendarKind} onChange={(event) => update({ calendarKind: event.target.value as CalendarKind })}>{calendarKinds.map((kind) => <option key={kind.id} value={kind.id}>{kind.label}</option>)}</select></label>
    <label className="rita-inline-check"><input type="checkbox" checked={draft.important} onChange={(event) => update({ important: event.target.checked })}/> 중요 일정</label>
    <button disabled={!draft.title.trim() || !draft.startDate || Boolean(draft.endDate && draft.endDate < draft.startDate)} onClick={onConfirm}><Check size={15}/> 일정 추가</button>
  </article>
}

function attachmentIntent(file: File): AttachmentIntent {
  if (file.type.startsWith('image/')) return 'business-card'
  if (file.type.startsWith('audio/')) return 'audio'
  return 'document'
}

function attachmentRequest(intent: AttachmentIntent, name: string) {
  if (intent === 'business-card') return `${name} 명함을 읽어서 인연록 초안으로 만들어줘`
  if (intent === 'audio') return `${name} 음성을 듣고 요약해서 비망록 초안으로 만들어줘`
  return `${name} 문서를 읽고 요약해서 비망록 초안으로 만들어줘`
}

function formatBytes(size: number) { return size < 1024 * 1024 ? `${Math.ceil(size / 1024)}KB` : `${(size / 1024 / 1024).toFixed(1)}MB` }
function inferTags(content: string) { return ['Hydro Hawk', 'Princess OS', '회의', '아이디어', '중요'].filter((tag) => content.toLocaleLowerCase('ko').includes(tag.toLocaleLowerCase('ko'))).slice(0, 3) }
