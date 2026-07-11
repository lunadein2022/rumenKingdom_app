import { useEffect, useRef, useState } from 'react'
import { Check, CirclePlus, FileText, Image as ImageIcon, LoaderCircle, Music, Send, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { RitaFace, type RitaExpression } from '../../components/RitaFace'
import { analyzeRitaAttachment, askRita, type AttachmentIntent, type RitaAttachmentAnalysis } from '../../services/ritaService'

type ChatMessage = { from: 'rita' | 'user'; text: string; expression?: RitaExpression }
type MemoDraft = { kind: 'memo'; title: string; content: string; tags: string[] }
type Draft = MemoDraft | RitaAttachmentAnalysis

const welcomeMessage: ChatMessage = {
  from: 'rita',
  text: '공주님을 기다리고 있었어요. 오늘은 무엇을 정리해 드릴까요?',
  expression: 'welcome',
}

export function RitaPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const fileInput = useRef<HTMLInputElement>(null)
  const prompt = (location.state as { prompt?: string } | null)?.prompt
  const [input, setInput] = useState(prompt ?? '')
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('rumen-rita-conversation') ?? 'null') as ChatMessage[] || [welcomeMessage]
    } catch { return [welcomeMessage] }
  })

  useEffect(() => { localStorage.setItem('rumen-rita-conversation', JSON.stringify(messages.slice(-40))) }, [messages])
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
    if (/(메모해\s*줘|메모해줘|비망록에|기록해\s*줘)/.test(value)) {
      const content = value.replace(/리타[야아]?[,\s]*/g, '').replace(/(이거|이 내용)?\s*(메모해\s*줘|비망록에\s*(적어|저장해)\s*줘|기록해\s*줘)/g, '').trim() || value
      setDraft({ kind: 'memo', title: content.length > 26 ? `${content.slice(0, 26)}…` : content, content, tags: inferTags(content) })
      setMessages((current) => [...current, { from: 'rita', text: '비망록에 저장할 초안을 정리했어요. 내용을 확인해 주세요.', expression: 'speaking' }])
      return
    }
    setLoading(true)
    try {
      const reply = await askRita(nextMessages.map((message) => ({ role: message.from === 'rita' ? 'assistant' : 'user', content: message.text })))
      setMessages((current) => [...current, { from: 'rita', text: reply, expression: 'speaking' }])
    } catch (error) {
      setMessages((current) => [...current, { from: 'rita', text: error instanceof Error ? error.message : '지금은 왕실 통신망이 불안정해요.', expression: 'error' }])
    } finally { setLoading(false) }
  }

  const confirmDraft = () => {
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
    } else {
      navigate('/library/memos/new', { state: { draft: { title: draft.title, content: draft.content, tags: draft.tags } } })
    }
  }

  return <div className="rita-layout">
    <aside className="rita-portrait glass-panel"><div className="portrait-halo"/><img className="rita-full-character" src="/assets/characters/rita-full.webp" alt="왕실 메이드 리타"/><div className="rita-portrait-copy"><small>ROYAL MAID</small><h2>리타</h2><p>공주님의 하루가 조금 더 가벼워지도록 곁에서 정리해 드릴게요.</p></div></aside>
    <section className="chat glass-panel" aria-busy={loading}>
      <div className="chat-head"><div><span className="online"/><b>왕실 메이드 리타</b><small>{loading ? '자료를 읽고 정리하고 있어요' : '언제나 곁에 있어요'}</small></div><button className="chat-clear" onClick={() => { setMessages([welcomeMessage]); setDraft(null); removeAttachment() }}>대화 지우기</button></div>
      <div className="messages" aria-live="polite">
        {messages.map((message, index) => <div key={index} className={`message ${message.from}`}>{message.from === 'rita' ? <RitaFace expression={message.expression}/> : <img className="princess-message-avatar" src="/assets/characters/princess-bust.webp" alt="공주"/>}<p>{message.text}</p></div>)}
        {draft && <DraftConfirmation draft={draft} onClose={() => setDraft(null)} onConfirm={confirmDraft}/>} 
        {loading && <div className="message rita typing"><RitaFace expression="thinking"/><p><i/><i/><i/></p></div>}
      </div>
      <div className="suggestions">{['오늘 일정 정리해줘', 'Hydro Hawk 요약해줘', '이 내용을 비망록에 메모해줘'].map((value) => <button key={value} onClick={() => setInput(value)}>{value}</button>)}</div>
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

function DraftConfirmation({ draft, onClose, onConfirm }: { draft: Draft; onClose: () => void; onConfirm: () => void }) {
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
