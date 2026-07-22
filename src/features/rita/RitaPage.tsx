import { useEffect, useRef, useState } from 'react'
import { Check, CirclePlus, FileText, Image as ImageIcon, LoaderCircle, Music, Send, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { RitaFace, type RitaExpression } from '../../components/RitaFace'
import { analyzeRitaAttachment, interpretRitaRequest, maximumAttachmentBytes, type AttachmentIntent, type RitaAttachmentAnalysis, type RitaRequestAnalysis } from '../../services/ritaService'
import { calendarKinds, useKingdomStore } from '../../store'
import type { CalendarKind, Project, QuestPriority, QuestType } from '../../types'
import { accountStorage, accountStorageKey } from '../../lib/accountScope'
import { PrincessPortrait } from '../../components/PrincessPortrait'
import { useSelectedPrincess } from '../../lib/princesses'
import { useRuntimeConfig } from '../runtime/RuntimeConfig'
import { useRitaUsage } from '../../lib/useRitaUsage'
import { deleteRitaConversations, loadRecentRitaConversation, saveRitaConversation } from '../../services/ritaConversationService'

type ChatMessage = { from: 'rita' | 'user'; text: string; expression?: RitaExpression }
type MemoDraft = { kind: 'memo'; title: string; content: string; tags: string[] }
type ProjectDraft = Extract<RitaRequestAnalysis, { kind: 'project' }>
type QuestDraft = Extract<RitaRequestAnalysis, { kind: 'quest' }>
type CalendarDraft = Extract<RitaRequestAnalysis, { kind: 'calendar' }>
type RelationshipDraft = Extract<RitaRequestAnalysis, { kind: 'relationship' }>
type Draft = MemoDraft | ProjectDraft | QuestDraft | CalendarDraft | RelationshipDraft | RitaAttachmentAnalysis

const welcomeMessage: ChatMessage = {
  from: 'rita',
  text: '공주님을 기다리고 있었어요. 오늘은 무엇을 정리해 드릴까요?',
  expression: 'welcome',
}

export function RitaPage({ demoMode = false }: { demoMode?: boolean }) {
  const navigate = useNavigate()
  const princess = useSelectedPrincess()
  const { config, featureEnabled } = useRuntimeConfig()
  const { usage } = useRitaUsage(!demoMode)
  const location = useLocation()
  const fileInput = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const messagesRef = useRef<HTMLDivElement>(null)
  const { projects, addProject, addQuest, addEvent } = useKingdomStore()
  const conversationStorageKey = accountStorageKey('rumen-rita-conversation')
  const conversationStorage = accountStorage()
  const prompt = (location.state as { prompt?: string } | null)?.prompt
  const [input, setInput] = useState(prompt ?? '')
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [savedAction, setSavedAction] = useState<{ path: string; label: string } | null>(null)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      return JSON.parse(conversationStorage.getItem(conversationStorageKey) ?? 'null') as ChatMessage[] || [welcomeMessage]
    } catch { return [welcomeMessage] }
  })
  const [conversationReady, setConversationReady] = useState(demoMode)
  const expectedPoints = attachment
    ? expectedAttachmentPoints(config.aiPointPolicy.requestCosts.attachment, attachment)
    : config.aiPointPolicy.requestCosts.interpretRequest

  useEffect(() => { conversationStorage.setItem(conversationStorageKey, JSON.stringify(messages.slice(-40))) }, [conversationStorage, conversationStorageKey, messages])
  useEffect(() => {
    if (demoMode) return
    let active = true
    void loadRecentRitaConversation().then((saved) => {
      if (active && saved.length) setMessages(saved as ChatMessage[])
    }).catch(() => undefined).finally(() => { if (active) setConversationReady(true) })
    return () => { active = false }
  }, [demoMode])
  useEffect(() => {
    if (demoMode || !conversationReady) return
    const timer = window.setTimeout(() => void saveRitaConversation(messages).catch(() => undefined), 900)
    return () => window.clearTimeout(timer)
  }, [conversationReady, demoMode, messages])
  useEffect(() => { const el = messagesRef.current; if (el) el.scrollTop = el.scrollHeight }, [messages, draft, loading, savedAction])
  useEffect(() => { if (prompt) navigate('/rita', { replace: true, state: null }) }, [navigate, prompt])
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const selectFile = (file?: File) => {
    if (!file) return
    const intent = attachmentIntent(file)
    if (file.size > maximumAttachmentBytes(file, intent)) {
      const message = intent === 'audio' ? '음성 파일은 25MB·30분 이하로 첨부해 주세요.'
        : /\.(?:hwp|hwpx)$/i.test(file.name) ? 'HWP·HWPX는 20MB·200쪽 이하로 첨부해 주세요.'
          : '문서와 이미지는 10MB 이하로 첨부해 주세요.'
      setMessages((current) => [...current, { from: 'rita', text: message, expression: 'concern' }])
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
  const clearConversation = () => {
    setMessages([welcomeMessage]); setDraft(null); removeAttachment()
    if (!demoMode) void deleteRitaConversations().catch(() => undefined)
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
        removeAttachment()
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
    const wantsRelationship = /(인연록|명함|연락처|인맥)/.test(value)
    if (!wantsRelationship && /(메모해\s*줘|메모해줘|비망록에|기록해\s*줘)/.test(value)) {
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
      } else if (analysis.kind === 'relationship') {
        setDraft(analysis)
        setMessages((current) => [...current, { from: 'rita', text: analysis.reply || '인연록에 저장할 초안을 정리했어요. 내용을 확인해 주세요.', expression: 'speaking' }])
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
    } else if (draft.kind === 'relationship') {
      navigate('/library/relationships/new', { state: { draft: {
        name: draft.name,
        organization: draft.organization,
        position: draft.position,
        phone: draft.phone,
        email: draft.email,
        address: draft.address,
        social: draft.social,
        memo: draft.memo,
        tags: draft.tags,
        groupIds: draft.groupIds ?? [],
      } } })
    } else if (draft.kind === 'memorandum') {
      navigate('/library/memos/new', { state: { draft: {
        title: draft.title,
        content: memorandumContent(draft),
        tags: draft.tags,
        transcript: draft.transcript,
        sourceAttachment: draft.attachment,
      } } })
    } else if (draft.kind === 'memo') {
      navigate('/library/memos/new', { state: { draft: { title: draft.title, content: draft.content, tags: draft.tags } } })
    } else if (draft.kind === 'project') {
      const savedId = await addProject({
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
      if (!savedId) {
        setMessages((current) => [...current, { from: 'rita', text: '메인퀘스트를 저장하지 못했어요. 연결 상태를 확인한 뒤 다시 시도해 주세요.', expression: 'error' }])
        return
      }
      setDraft(null)
      setSavedAction({ path: '/office', label: '집무실에서 보기' })
      setMessages((current) => [...current, { from: 'rita', text: `“${draft.title}” 메인퀘스트를 추가했어요.`, expression: 'celebration' }])
    } else if (draft.kind === 'quest') {
      if (draft.needsProjectSelection && !draft.projectId) {
        setMessages((current) => [...current, { from: 'rita', text: '연결할 메인퀘스트를 선택하거나 독립 퀘스트를 선택해 주세요.', expression: 'concern' }])
        return
      }
      const project = projects.find((item) => item.id === draft.projectId)
      const savedId = await addQuest({
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
      if (!savedId) {
        setMessages((current) => [...current, { from: 'rita', text: '퀘스트를 저장하지 못했어요. 연결 상태를 확인한 뒤 다시 시도해 주세요.', expression: 'error' }])
        return
      }
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

  return <div className={`rita-layout ${dragActive ? 'is-dragging' : ''}`}
    onDragEnter={(event) => { event.preventDefault(); dragDepth.current += 1; setDragActive(true) }}
    onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' }}
    onDragLeave={(event) => { event.preventDefault(); dragDepth.current -= 1; if (dragDepth.current <= 0) { dragDepth.current = 0; setDragActive(false) } }}
    onDrop={(event) => { event.preventDefault(); dragDepth.current = 0; setDragActive(false); if (featureEnabled('fileAnalysis')) selectFile(event.dataTransfer.files?.[0]) }}>
    {dragActive && <div className="rita-drop-overlay"><FileText size={34}/><b>여기에 놓아 리타에게 전해 주세요</b><span>명함·PDF·DOCX·HWP·HWPX·텍스트·음성</span></div>}
    <aside className="rita-portrait glass-panel"><div className="portrait-halo"/><img className="rita-full-character" src="/assets/characters/rita-full.webp" alt="왕실 메이드 리타"/><div className="rita-portrait-copy"><small>ROYAL MAID</small><h2>리타</h2><p>공주님의 하루가 조금 더 가벼워지도록 곁에서 정리해 드릴게요.</p></div></aside>
    <section className="chat glass-panel" aria-busy={loading}>
      <div className="chat-head"><div><span className="online"/><b>왕실 메이드 리타</b><small>{loading ? '자료를 읽고 정리하고 있어요' : '언제나 곁에 있어요'}</small></div><button className="chat-clear" onClick={clearConversation}>대화 지우기</button></div>
      {demoMode && <div className="rita-demo-notice">데모 모드에서는 리타의 화면만 미리 볼 수 있어요. 실제 대화와 첨부 분석은 로그인이 필요합니다.</div>}
      <div className="messages" aria-live="polite" ref={messagesRef}>
        {messages.map((message, index) => <div key={index} className={`message ${message.from}`}>{message.from === 'rita' ? <RitaFace expression={message.expression}/> : <PrincessPortrait className="princess-message-avatar" princess={princess}/>}<p>{message.text}</p></div>)}
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
        <input ref={fileInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif,.pdf,.docx,.hwp,.hwpx,.txt,.md,.csv,audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/m4a,audio/ogg,audio/webm" onChange={(event) => selectFile(event.target.files?.[0])}/>
        <button aria-label="파일 첨부" title={featureEnabled('fileAnalysis') ? '명함, 문서 또는 음성 첨부' : '파일 분석은 현재 점검 중입니다'} disabled={!featureEnabled('fileAnalysis')} onClick={() => fileInput.current?.click()}><CirclePlus size={19}/></button>
        <input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && !event.nativeEvent.isComposing && void submit()} placeholder={attachment ? '파일과 함께 전할 말을 적어 주세요…' : '리타에게 말해 주세요…'}/>
        <button className="send" onClick={() => void submit()} disabled={loading || (!input.trim() && !attachment)} aria-label="보내기"><Send size={17}/></button>
      </div>
      {!demoMode && <div className="composer-policy"><span>예상 <b>{expectedPoints}P</b></span><span>남은 포인트 <b>{usage?.totalRemaining ?? '—'}P</b></span></div>}
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
  if (draft.kind === 'relationship') return <RelationshipDraftConfirmation draft={draft} onChange={onChange} onClose={onClose} onConfirm={onConfirm}/>
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

function RelationshipDraftConfirmation({ draft, onChange, onClose, onConfirm }: { draft: RelationshipDraft; onChange: (draft: Draft) => void; onClose: () => void; onConfirm: () => void }) {
  const update = (change: Partial<RelationshipDraft>) => onChange({ ...draft, ...change })
  const groups = useKingdomStore((state) => state.relationshipGroups)
  return <article className="rita-confirmation rita-action-draft">
    <div><span>RELATIONSHIP DRAFT</span><button aria-label="초안 닫기" onClick={onClose}><X size={14}/></button></div>
    <label>이름<input value={draft.name} onChange={(event) => update({ name: event.target.value })}/></label>
    <div className="rita-draft-row">
      <label>소속<input value={draft.organization} onChange={(event) => update({ organization: event.target.value })}/></label>
      <label>직함<input value={draft.position} onChange={(event) => update({ position: event.target.value })}/></label>
    </div>
    <div className="rita-draft-row">
      <label>전화번호<input value={draft.phone} onChange={(event) => update({ phone: event.target.value })}/></label>
      <label>이메일<input value={draft.email} onChange={(event) => update({ email: event.target.value })}/></label>
    </div>
    <label>메모<textarea value={draft.memo} onChange={(event) => update({ memo: event.target.value })}/></label>
    <fieldset className="rita-relationship-groups"><legend>어느 그룹에 보관할까요?</legend>{groups.length ? groups.map((group) => <label key={group.id}><input type="checkbox" checked={(draft.groupIds ?? []).includes(group.id)} onChange={() => update({ groupIds: (draft.groupIds ?? []).includes(group.id) ? (draft.groupIds ?? []).filter((id) => id !== group.id) : [...(draft.groupIds ?? []), group.id] })}/><i style={{ background: group.color }}/>{group.name}</label>) : <small>아직 그룹이 없어요. 인연록 확인 화면에서 새 그룹을 만들 수 있습니다.</small>}</fieldset>
    <button disabled={!draft.name.trim()} onClick={onConfirm}><Check size={15}/> 인연록에서 확인하고 저장</button>
  </article>
}

function attachmentIntent(file: File): AttachmentIntent {
  if (file.type.startsWith('image/')) return 'business-card'
  if (file.type.startsWith('audio/') || /\.(?:mp3|m4a|wav|ogg|webm)$/i.test(file.name)) return 'audio'
  return 'document'
}

function attachmentRequest(intent: AttachmentIntent, name: string) {
  if (intent === 'business-card') return `${name} 명함을 읽어서 인연록 초안으로 만들어줘`
  if (intent === 'audio') return `${name} 음성을 듣고 요약해서 비망록 초안으로 만들어줘`
  return `${name} 문서를 읽고 요약해서 비망록 초안으로 만들어줘`
}

function formatBytes(size: number) { return size < 1024 * 1024 ? `${Math.ceil(size / 1024)}KB` : `${(size / 1024 / 1024).toFixed(1)}MB` }
function memorandumContent(draft: Extract<RitaAttachmentAnalysis, { kind: 'memorandum' }>) {
  const sections = [draft.summary]
  const append = (title: string, items?: string[]) => { if (items?.length) sections.push(`${title}\n${items.map((item) => `- ${item}`).join('\n')}`) }
  append('핵심 내용', draft.keyPoints)
  append('결정 사항', draft.decisions)
  append('할 일', draft.actionItems)
  append('일자', draft.dates)
  append('관련 인물', draft.people)
  return sections.filter(Boolean).join('\n\n')
}
function inferTags(content: string) { return ['Hydro Hawk', 'Princess OS', '회의', '아이디어', '중요'].filter((tag) => content.toLocaleLowerCase('ko').includes(tag.toLocaleLowerCase('ko'))).slice(0, 3) }
function expectedAttachmentPoints(costs: { businessCard: number; audioBase: number; audioPerMiB: number; documentBase: number; documentPerMiB: number; maximum: number }, file: File) { const chunks = Math.ceil(file.size / 1024 / 1024); const kind = attachmentIntent(file); return kind === 'business-card' ? costs.businessCard : Math.min(costs.maximum, kind === 'audio' ? costs.audioBase + chunks * costs.audioPerMiB : costs.documentBase + chunks * costs.documentPerMiB) }
