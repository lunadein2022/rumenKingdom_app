import { useState } from 'react'
import { Check, Pencil, Save, Star, Trash2 } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { BackButton } from '../../components/BackButton'
import { EmptyState } from '../../components/Common'
import { useKingdomStore } from '../../store'
import { accountStorageKey } from '../../lib/accountScope'
import { clearPersistentState, usePersistentState } from '../../lib/usePersistentState'
import type { MemoStatus, SourceAttachment } from '../../types'

type RitaMemoDraft = {
  title: string
  content: string
  tags?: string[]
  transcript?: string
  sourceAttachment?: SourceAttachment
}

export function MemoPage() {
  const { memoId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { memos, projects, addMemo, updateMemo, deleteMemo } = useKingdomStore()
  const draft = (location.state as { draft?: RitaMemoDraft } | null)?.draft
  const isNew = memoId === 'new'
  const memo = memos.find((item) => item.id === memoId)
  const dk = (field: string) => (isNew ? accountStorageKey(`draft-memo-new:${field}`) : null)
  const [editing, setEditing] = useState(isNew)
  const [title, setTitle] = usePersistentState(dk('title'), memo?.title ?? draft?.title ?? '')
  const [content, setContent] = usePersistentState(dk('content'), memo?.content ?? draft?.content ?? '')
  const [tags, setTags] = usePersistentState(dk('tags'), memo?.tags.join(', ') ?? draft?.tags?.join(', ') ?? '')
  const [projectId, setProjectId] = usePersistentState(dk('projectId'), memo?.projectId ?? '')
  const [important, setImportant] = usePersistentState(dk('important'), memo?.important ?? false)
  const [favorite, setFavorite] = usePersistentState(dk('favorite'), memo?.favorite ?? false)
  const [status, setStatus] = usePersistentState<MemoStatus>(dk('status'), memo?.status ?? 'normal')

  if (!isNew && !memo) return <div><BackButton fallback="/library/memos"/><section className="panel glass-panel"><EmptyState title="메모를 찾을 수 없어요" action="비망록으로" onAction={() => navigate('/library/memos', { replace: true })}/></section></div>

  const save = async () => {
    const input = {
      title: title.trim(), content: content.trim(), tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      projectId: projectId || undefined, important, favorite, status,
      source: memo?.source ?? (draft ? 'rita' : 'manual') as 'rita' | 'manual',
      transcript: memo?.transcript ?? draft?.transcript,
      sourceAttachment: memo?.sourceAttachment ?? draft?.sourceAttachment,
    }
    if (!input.title || !input.content) return
    if (memo) { if (await updateMemo(memo.id, input)) setEditing(false) }
    else { const id = await addMemo(input); if (id) { clearPersistentState(dk('title'), dk('content'), dk('tags'), dk('projectId'), dk('important'), dk('favorite'), dk('status')); navigate(`/library/memos/${id}`, { replace: true, state: null }) } }
  }

  const remove = async () => {
    if (memo && confirm(`“${memo.title}” 메모를 삭제할까요?`)) {
      if (await deleteMemo(memo.id)) navigate('/library/memos', { replace: true })
    }
  }

  const sourceAttachment = memo?.sourceAttachment ?? draft?.sourceAttachment
  const transcript = memo?.transcript ?? draft?.transcript

  return <div>
    <BackButton fallback="/library/memos" label="비망록으로"/>
    <article className="memo-detail panel glass-panel parchment-panel">
      <div className="memo-head">
        <div><span className="eyebrow">ROYAL MEMORANDUM</span><h2>{isNew ? '새 비망록' : memo?.title}</h2><p>{memo?.source === 'rita' || draft ? '리타가 정리한 메모' : '공주님이 직접 남긴 메모'}</p></div>
        {!isNew && !editing && <div><button onClick={async () => { const next = !favorite; if (memo && await updateMemo(memo.id, { favorite: next })) setFavorite(next) }} aria-label="즐겨찾기"><Star size={18} fill={favorite ? 'currentColor' : 'none'}/></button><button onClick={() => setEditing(true)}><Pencil size={16}/> 편집</button></div>}
      </div>
      {draft && isNew && <div className="rita-draft-notice"><Check size={16}/><span>리타가 파일을 읽고 정리한 초안입니다. 확인 후 저장해 주세요.</span></div>}
      {editing ? <div className="record-form">
        <label>제목<input value={title} onChange={(event) => setTitle(event.target.value)} required/></label>
        <label>내용<textarea value={content} onChange={(event) => setContent(event.target.value)} required/></label>
        <div className="form-row"><label>상태<select value={status} onChange={(event) => setStatus(event.target.value as MemoStatus)}><option value="normal">일반</option><option value="review">나중에 확인</option><option value="completed">완료</option><option value="archived">보관</option></select></label><label>관련 프로젝트<select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">연결 안 함</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label></div>
        <label>태그<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="쉼표로 구분"/></label>
        {sourceAttachment && <SourceFile attachment={sourceAttachment}/>} 
        {transcript && <Transcript text={transcript}/>} 
        <div className="inline-options"><label><input type="checkbox" checked={important} onChange={(event) => setImportant(event.target.checked)}/> 중요 메모</label><label><input type="checkbox" checked={favorite} onChange={(event) => setFavorite(event.target.checked)}/> 즐겨찾기</label></div>
        <div className="detail-footer-actions"><button className="primary" onClick={save}><Save size={16}/> 확인하고 저장</button>{memo && <button onClick={() => setEditing(false)}>취소</button>}</div>
      </div> : <div className="memo-body">
        <p>{memo?.content}</p>
        <dl><div><dt>상태</dt><dd>{memoStatusLabel[memo?.status ?? 'normal']}</dd></div><div><dt>관련 프로젝트</dt><dd>{projects.find((project) => project.id === memo?.projectId)?.title ?? '연결 없음'}</dd></div></dl>
        {sourceAttachment && <SourceFile attachment={sourceAttachment}/>} 
        {transcript && <Transcript text={transcript}/>} 
        <div className="detail-tags">{memo?.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        <button className="danger" onClick={remove}><Trash2 size={16}/> 메모 삭제</button>
      </div>}
    </article>
  </div>
}

function SourceFile({ attachment }: { attachment: SourceAttachment }) {
  return <div className="source-file"><b>원본 파일</b><span>{attachment.name}</span><small>{attachment.storagePath ? 'Supabase 비공개 보관 완료' : '분석 완료 · 원본 보관 미연결'}</small></div>
}

function Transcript({ text }: { text: string }) {
  return <details className="transcript-preview"><summary>음성 전체 변환문</summary><p>{text}</p></details>
}

const memoStatusLabel: Record<MemoStatus, string> = { normal: '일반', review: '나중에 확인', completed: '완료', archived: '보관' }
