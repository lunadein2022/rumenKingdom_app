import { useState } from 'react'
import { Heart, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { BackButton } from '../../components/BackButton'
import { EmptyState } from '../../components/Common'
import { useKingdomStore } from '../../store'
import { accountStorageKey } from '../../lib/accountScope'
import { clearPersistentState, usePersistentState } from '../../lib/usePersistentState'

export function RelationshipPage() {
  const { relationshipId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const draft = (location.state as { draft?: {
    name: string; organization: string; position: string; phone: string; email: string; address: string
    social: string; memo: string; tags: string[]; groupIds?: string[]; ocrText?: string
    attachment?: { name: string; mimeType: string; size: number; storagePath?: string }
  } } | null)?.draft
  const { relationships, relationshipGroups, addRelationship, updateRelationship, deleteRelationship, addRelationshipGroup } = useKingdomStore()
  const isNew = relationshipId === 'new'
  const relationship = relationships.find((item) => item.id === relationshipId)
  const dk = (field: string) => (isNew ? accountStorageKey(`draft-relationship-new:${field}`) : null)
  const [editing, setEditing] = useState(isNew)
  const [name, setName] = usePersistentState(dk('name'), relationship?.name ?? draft?.name ?? '')
  const [organization, setOrganization] = usePersistentState(dk('organization'), relationship?.organization ?? draft?.organization ?? '')
  const [position, setPosition] = usePersistentState(dk('position'), relationship?.position ?? draft?.position ?? '')
  const [phone, setPhone] = usePersistentState(dk('phone'), relationship?.phone ?? draft?.phone ?? '')
  const [email, setEmail] = usePersistentState(dk('email'), relationship?.email ?? draft?.email ?? '')
  const [address, setAddress] = usePersistentState(dk('address'), relationship?.address ?? draft?.address ?? '')
  const [social, setSocial] = usePersistentState(dk('social'), relationship?.social ?? draft?.social ?? '')
  const [relationshipType, setRelationshipType] = usePersistentState(dk('relationshipType'), relationship?.relationshipType ?? '지인')
  const [firstMetAt, setFirstMetAt] = usePersistentState(dk('firstMetAt'), relationship?.firstMetAt ?? '')
  const [lastContactedAt, setLastContactedAt] = usePersistentState(dk('lastContactedAt'), relationship?.lastContactedAt ?? '')
  const [memo, setMemo] = usePersistentState(dk('memo'), relationship?.memo ?? draft?.memo ?? '')
  const [tags, setTags] = usePersistentState(dk('tags'), relationship?.tags.join(', ') ?? draft?.tags.join(', ') ?? '')
  const [groupIds, setGroupIds] = usePersistentState<string[]>(dk('groupIds'), relationship?.groupIds ?? draft?.groupIds ?? [])
  const [newGroupName, setNewGroupName] = useState('')
  const [favorite, setFavorite] = usePersistentState(dk('favorite'), relationship?.favorite ?? false)
  if (!isNew && !relationship) return <div><BackButton fallback="/library/relationships"/><section className="panel glass-panel"><EmptyState title="인연을 찾을 수 없어요" action="인연록으로" onAction={() => navigate('/library/relationships', { replace: true })}/></section></div>
  const save = async () => {
    const input = { name: name.trim(), organization: organization.trim(), position: position.trim(), phone: phone.trim(), email: email.trim(), address: address.trim(), social: social.trim(), relationshipType, firstMetAt: firstMetAt || undefined, lastContactedAt: lastContactedAt || undefined, memo: memo.trim(), tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean), groupIds, favorite, businessCardImageRef: relationship?.businessCardImageRef ?? draft?.attachment?.storagePath, businessCardOcrText: relationship?.businessCardOcrText ?? draft?.ocrText, sourceAttachment: relationship?.sourceAttachment ?? draft?.attachment, source: (relationship?.source ?? (draft ? 'rita' : 'manual')) as 'rita' | 'manual' }
    if (!input.name) return
    if (relationship) { if (await updateRelationship(relationship.id, input)) setEditing(false) }
    else { const id = await addRelationship(input); if (id) { clearPersistentState(dk('name'), dk('organization'), dk('position'), dk('phone'), dk('email'), dk('address'), dk('social'), dk('relationshipType'), dk('firstMetAt'), dk('lastContactedAt'), dk('memo'), dk('tags'), dk('groupIds'), dk('favorite')); navigate(`/library/relationships/${id}`, { replace: true }) } }
  }
  const createGroup = async () => {
    const id = await addRelationshipGroup(newGroupName)
    if (!id) return
    setGroupIds((current) => [...current, id])
    setNewGroupName('')
  }
  const remove = async () => { if (relationship && confirm(`“${relationship.name}” 인연을 삭제할까요?`) && await deleteRelationship(relationship.id)) navigate('/library/relationships', { replace: true }) }
  return <div><BackButton fallback="/library/relationships" label="인연록으로"/><article className="relationship-detail panel glass-panel parchment-panel"><div className="relationship-head"><div><span className="eyebrow">ROYAL RELATIONSHIP</span><h2>{isNew ? '새 인연 기록' : relationship?.name}</h2><p>{organization || '소속 미지정'}{position ? ` · ${position}` : ''}</p></div>{!isNew && !editing && <div><button onClick={async () => { const next = !favorite; if (relationship && await updateRelationship(relationship.id, { favorite: next })) setFavorite(next) }} aria-label="즐겨찾기"><Heart size={18} fill={favorite ? 'currentColor' : 'none'}/></button><button onClick={() => setEditing(true)}><Pencil size={16}/> 편집</button></div>}</div>{draft && isNew && <div className="rita-draft-notice"><CheckIcon/><span>{draft.attachment ? '리타가 명함에서 읽은 초안입니다. 오독된 내용과 보관할 그룹을 확인한 뒤 저장해 주세요.' : '리타가 정리한 인연록 초안입니다. 보관할 그룹을 선택해 주세요.'}</span></div>}{editing ? <div className="record-form"><div className="form-row"><label>이름<input value={name} onChange={(event) => setName(event.target.value)} required/></label><label>관계 유형<input value={relationshipType} onChange={(event) => setRelationshipType(event.target.value)}/></label></div><div className="form-row"><label>소속<input value={organization} onChange={(event) => setOrganization(event.target.value)}/></label><label>직함<input value={position} onChange={(event) => setPosition(event.target.value)}/></label></div><div className="form-row"><label>전화번호<input value={phone} onChange={(event) => setPhone(event.target.value)}/></label><label>이메일<input type="email" value={email} onChange={(event) => setEmail(event.target.value)}/></label></div><label>주소<input value={address} onChange={(event) => setAddress(event.target.value)}/></label><label>SNS 또는 기타 연락처<input value={social} onChange={(event) => setSocial(event.target.value)}/></label><div className="form-row"><label>첫 만남<input type="date" value={firstMetAt} onChange={(event) => setFirstMetAt(event.target.value)}/></label><label>최근 연락일<input type="date" value={lastContactedAt} onChange={(event) => setLastContactedAt(event.target.value)}/></label></div><fieldset className="relationship-group-picker"><legend>보관 그룹</legend>{relationshipGroups.length ? <div>{relationshipGroups.map((group) => <label key={group.id}><input type="checkbox" checked={groupIds.includes(group.id)} onChange={() => setGroupIds((current) => current.includes(group.id) ? current.filter((id) => id !== group.id) : [...current, group.id])}/><i style={{ background: group.color }}/>{group.name}</label>)}</div> : <p>아직 만든 그룹이 없습니다. 아래에서 첫 그룹을 만들어 보세요.</p>}<div className="relationship-group-create"><input value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} placeholder="새 그룹 이름"/><button type="button" onClick={() => void createGroup()} disabled={!newGroupName.trim()}><Plus size={14}/> 그룹 만들기</button></div></fieldset><label>태그<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="쉼표로 구분"/></label><label>메모<textarea value={memo} onChange={(event) => setMemo(event.target.value)}/></label>{draft?.attachment && <div className="source-file"><b>원본 명함</b><span>{draft.attachment.name}</span><small>{draft.attachment.storagePath ? '비공개 보관 완료' : '분석 완료 · 원본 보관 미연결'}</small></div>}<label className="inline-check"><input type="checkbox" checked={favorite} onChange={(event) => setFavorite(event.target.checked)}/> 즐겨찾기</label><div className="detail-footer-actions"><button className="primary" onClick={save}><Save size={16}/> 저장</button>{relationship && <button onClick={() => setEditing(false)}>취소</button>}</div></div> : <div className="relationship-body"><div className="relationship-group-tags">{relationship?.groupIds.length ? relationship.groupIds.map((groupId) => { const group = relationshipGroups.find((item) => item.id === groupId); return group ? <span key={group.id}><i style={{ background: group.color }}/>{group.name}</span> : null }) : <span>미분류</span>}</div><dl className="relationship-contact-grid"><div><dt>이름</dt><dd>{relationship?.name || '미등록'}</dd></div><div><dt>소속</dt><dd>{relationship?.organization || '미등록'}</dd></div><div><dt>직함</dt><dd>{relationship?.position || '미등록'}</dd></div><div><dt>전화번호</dt><dd>{relationship?.phone || '미등록'}</dd></div><div><dt>이메일</dt><dd>{relationship?.email || '미등록'}</dd></div><div><dt>주소</dt><dd>{relationship?.address || '미등록'}</dd></div></dl><dl className="relationship-extra-grid"><div><dt>관계 유형</dt><dd>{relationship?.relationshipType || '미지정'}</dd></div><div><dt>SNS·기타 연락처</dt><dd>{relationship?.social || '미등록'}</dd></div><div><dt>첫 만남</dt><dd>{relationship?.firstMetAt || '기록 없음'}</dd></div><div><dt>최근 연락</dt><dd>{relationship?.lastContactedAt || '기록 없음'}</dd></div></dl><section className="relationship-notes"><h3>인연 메모</h3><p>{relationship?.memo || '아직 메모가 없습니다.'}</p></section>{relationship?.sourceAttachment && <div className="source-file"><b>원본 명함</b><span>{relationship.sourceAttachment.name}</span></div>}<div className="detail-tags">{relationship?.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><button className="danger" onClick={remove}><Trash2 size={16}/> 인연 삭제</button></div>}</article></div>
}

function CheckIcon() { return <span aria-hidden="true">✓</span> }
