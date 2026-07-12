import { useState } from 'react'
import { Pencil, Save, Star, Trash2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { BackButton } from '../../components/BackButton'
import { EmptyState } from '../../components/Common'
import { calendarKinds, useKingdomStore } from '../../store'
import type { CalendarKind } from '../../types'

export function CalendarEventDetailPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { events, updateEvent, deleteEvent } = useKingdomStore()
  const event = events.find((item) => item.id === eventId)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [date, setDate] = useState(event?.date ?? '')
  const [endDate, setEndDate] = useState(event?.endDate ?? event?.date ?? '')
  const [start, setStart] = useState(event?.start ?? '')
  const [end, setEnd] = useState(event?.end ?? '')
  const [allDay, setAllDay] = useState(event?.allDay ?? event?.start === '')
  const [kind, setKind] = useState<CalendarKind>(event?.kind ?? 'royal')
  const [important, setImportant] = useState(event?.important ?? false)
  const [recurrenceRule, setRecurrenceRule] = useState(event?.recurrenceRule ?? '')
  if (!event) return <div><BackButton fallback="/calendar"/><section className="panel glass-panel"><EmptyState title="일정을 찾을 수 없어요" action="왕실 일정표로" onAction={() => navigate('/calendar', { replace: true })}/></section></div>
  const save = () => { if (endDate < date) return; updateEvent(event.id, { title: title.trim(), description: description.trim(), date, endDate, start: allDay ? '' : start, end: allDay ? undefined : end || undefined, allDay, kind, important, recurrenceRule: recurrenceRule || undefined }); setEditing(false) }
  const remove = () => { if (confirm(`“${event.title}” 일정을 삭제할까요?`)) { deleteEvent(event.id); navigate('/calendar', { replace: true }) } }
  return <div><BackButton fallback="/calendar" label="왕실 일정표로"/><article className="event-detail panel glass-panel"><div className="detail-hero"><div><span className="eyebrow">ROYAL SCHEDULE</span><h2>{event.title}</h2><p>{event.date}{event.endDate && event.endDate !== event.date ? ` ~ ${event.endDate}` : ''} · {event.allDay ? '하루 종일' : event.start || '시간 미정'}{event.end ? ` — ${event.end}` : ''}</p></div>{!editing && <button onClick={() => setEditing(true)}><Pencil size={16}/> 일정 편집</button>}</div>{editing ? <div className="record-form"><label>일정 이름<input value={title} onChange={(change) => setTitle(change.target.value)}/></label><label>설명<textarea value={description} onChange={(change) => setDescription(change.target.value)}/></label><div className="form-row"><label>시작일<input type="date" value={date} onChange={(change) => { setDate(change.target.value); if (endDate < change.target.value) setEndDate(change.target.value) }}/></label><label>종료일<input type="date" min={date} value={endDate} onChange={(change) => setEndDate(change.target.value)}/></label></div><label className="inline-check"><input type="checkbox" checked={allDay} onChange={(change) => setAllDay(change.target.checked)}/> 종일 일정</label>{!allDay && <div className="form-row"><label>시작<input type="time" value={start} onChange={(change) => setStart(change.target.value)}/></label><label>종료<input type="time" value={end} min={start} onChange={(change) => setEnd(change.target.value)}/></label></div>}<label>반복<select value={recurrenceRule} onChange={(change) => setRecurrenceRule(change.target.value)}><option value="">반복 안 함</option><option value="FREQ=DAILY">매일</option><option value="FREQ=WEEKLY">매주</option><option value="FREQ=MONTHLY">매월</option></select></label><label>캘린더<select value={kind} onChange={(change) => setKind(change.target.value as CalendarKind)}>{calendarKinds.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="inline-check"><input type="checkbox" checked={important} onChange={(change) => setImportant(change.target.checked)}/> 중요 일정</label><div className="detail-footer-actions"><button className="primary" onClick={save}><Save size={16}/> 변경사항 저장</button><button onClick={() => setEditing(false)}>취소</button></div></div> : <div className="event-detail-body">{event.description && <p className="event-description">{event.description}</p>}<dl><div><dt>기간</dt><dd>{event.date}{event.endDate && event.endDate !== event.date ? ` ~ ${event.endDate}` : ''}</dd></div><div><dt>시간</dt><dd>{event.allDay ? '하루 종일' : event.start || '시간 미정'}{event.end ? ` — ${event.end}` : ''}</dd></div><div><dt>캘린더</dt><dd>{calendarKinds.find((item) => item.id === event.kind)?.label}</dd></div><div><dt>반복</dt><dd>{event.recurrenceRule || '반복 안 함'}</dd></div></dl>{event.important && <span className="important-badge"><Star size={14} fill="currentColor"/> 중요 일정</span>}<button className="danger" onClick={remove}><Trash2 size={16}/> 일정 삭제</button></div>}</article></div>
}
