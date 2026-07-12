import { useEffect, useMemo, useState } from 'react'
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth,
  parseISO, startOfMonth, startOfWeek,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import {
  Archive, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Crown,
  Flower2, LoaderCircle, Pencil, Plus, Search, Settings2, Star, Trash2, X,
} from 'lucide-react'
import { RitaFace } from '../../components/RitaFace'
import { calendarKinds, useKingdomStore } from '../../store'
import type { CalendarEvent, CalendarKind } from '../../types'
import { buildRecurrenceRule, eventOccurrenceOn, expandEventsBetween, parseRecurrenceRule } from '../../lib/recurrence'

type CalendarView = '월간' | '주간' | '일간' | '목록'

const kindClass: Record<CalendarKind, string> = {
  royal: 'sage', personal: 'mint', work: 'lilac', project: 'apricot', anniversary: 'rose',
}

const dateKey = (date: Date) => format(date, 'yyyy-MM-dd')

export function CalendarPage() {
  const navigate = useNavigate()
  const { selectedDate, setSelectedDate, events, addEvent, updateEvent, deleteEvent, moveEvent, calendarSync, clearCalendarSync } = useKingdomStore()
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(parseISO(selectedDate)))
  const [filters, setFilters] = useState<CalendarKind[]>(calendarKinds.map((kind) => kind.id))
  const [modal, setModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<CalendarView>('월간')
  const [importantOnly, setImportantOnly] = useState(false)

  const visibleEvents = useMemo(() => events
    .filter((event) => filters.includes(event.kind) && (!importantOnly || event.important) && event.title.toLocaleLowerCase('ko').includes(query.toLocaleLowerCase('ko')))
    .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`)), [events, filters, importantOnly, query])
  const selectedEvents = visibleEvents.map((event) => eventOccurrenceOn(event, selectedDate)).filter((event): event is CalendarEvent => Boolean(event))
  const selectedDateLabel = format(parseISO(selectedDate), 'yyyy년 M월 d일 (EEE)', { locale: ko })
  const today = dateKey(new Date())
  const importantEvents = visibleEvents.filter((event) => event.important).slice(0, 3)

  const selectDate = (date: string) => {
    setSelectedDate(date)
    setVisibleMonth(startOfMonth(parseISO(date)))
  }

  const goToday = () => selectDate(today)
  const moveMonth = (amount: number) => setVisibleMonth((month) => addMonths(month, amount))
  const openCreate = () => { setEditingEvent(null); setModal(true) }
  const openEdit = (event: CalendarEvent) => { setSelectedDate(event.date); setEditingEvent(event); setModal(true) }

  return <div className="calendar-shell glass-panel">
    <aside className="calendar-sidebar">
      <MiniCalendar month={visibleMonth} selected={selectedDate} onSelect={selectDate} onMonthChange={moveMonth} />
      <button className="new-event" onClick={openCreate}><Plus size={16} /> 새 일정</button>
      <div className="side-section-title"><span>일정 캘린더</span><Settings2 size={14} /></div>
      <div className="filter-list">{calendarKinds.map((kind) => <label key={kind.id}><input type="checkbox" checked={filters.includes(kind.id)} onChange={() => setFilters((current) => current.includes(kind.id) ? current.filter((id) => id !== kind.id) : [...current, kind.id])} /><span className={`checkmark ${kindClass[kind.id]}`}><Check size={10} /></span>{kind.label}</label>)}</div>
      <div className="side-section-title quick-title">빠른 필터</div>
      <button className="quick-filter" onClick={goToday}><Clock3 size={14} /> 오늘</button>
      <button className="quick-filter" onClick={() => setView('주간')}><CalendarDays size={14} /> 이번 주</button>
      <button className={`quick-filter ${importantOnly ? 'active' : ''}`} aria-pressed={importantOnly} onClick={() => setImportantOnly((value) => !value)}><Star size={14} /> 중요 일정</button>
    </aside>

    <section className="calendar-main">
      <div className="calendar-toolbar">
        <div className="view-tabs">{(['월간', '주간', '일간', '목록'] as const).map((item) => <button key={item} aria-pressed={view === item} className={view === item ? 'active' : ''} onClick={() => setView(item)}>{item}</button>)}</div>
        <div className="toolbar-month"><b>{format(visibleMonth, 'yyyy년 M월')}</b></div>
        <div className="toolbar-right"><button className="today-button" onClick={goToday}>오늘</button><div className="stepper"><button onClick={() => moveMonth(-1)} aria-label="이전 달"><ChevronLeft size={16} /></button><button onClick={() => moveMonth(1)} aria-label="다음 달"><ChevronRight size={16} /></button></div><label className="searchbox"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="일정 검색..." aria-label="일정 검색" /></label></div>
      </div>
      {view === '월간'
        ? <MonthGrid month={visibleMonth} events={visibleEvents} selected={selectedDate} onSelect={selectDate} onMove={moveEvent} onOpen={(event) => navigate(`/calendar/event/${event.id}`)} />
        : <AlternativeCalendarView mode={view} events={visibleEvents} selected={selectedDate} onSelect={selectDate} />}
    </section>

    <aside className="day-panel">
      <div className="day-title"><div><span>{selectedDateLabel}</span><small>{selectedDate === today ? '오늘의 일정' : '선택한 날의 일정'}</small></div>{selectedDate === today && <em>오늘</em>}</div>
      <div className="agenda-list">{selectedEvents.length ? selectedEvents.map((event) => <div className="agenda-item" key={event.id}><i className={kindClass[event.kind]} /><div><span>{event.allDay ? '하루 종일' : event.start || '시간 미정'}{event.end ? ` — ${event.end}` : ''}</span><b>{event.title}</b><small>{calendarKinds.find((kind) => kind.id === event.kind)?.label}{event.endDate && event.endDate !== event.date ? ` · ${event.date} ~ ${event.endDate}` : ''}</small></div><button onClick={() => openEdit(event)} aria-label={`${event.title} 편집`}><Pencil size={14} /></button><button onClick={() => deleteEvent(event.id)} aria-label={`${event.title} 삭제`}><Trash2 size={14} /></button></div>) : <EmptyMini onCreate={openCreate} />}</div>
      <div className="important-head"><span>중요 일정</span><button onClick={() => setView('목록')}>더보기 <ChevronRight size={12} /></button></div>
      <div className="important-list">{importantEvents.length ? importantEvents.map((event) => <button key={event.id} onClick={() => selectDate(event.date)}><small>{format(parseISO(event.date), 'M월 d일 (EEE)', { locale: ko })}</small><span>{event.title}</span>{event.kind === 'anniversary' ? <Crown size={15} /> : event.kind === 'project' ? <Archive size={15} /> : <Flower2 size={15} />}</button>) : <p className="important-empty">표시할 중요 일정이 없습니다.</p>}</div>
      <div className="rita-note"><RitaFace expression="notification" /><p><b>리타의 한마디</b>{selectedEvents.length ? `공주님, 선택한 날에는 일정이 ${selectedEvents.length}건 있어요.` : '공주님, 선택한 날은 아직 여유로워요.'}</p></div>
    </aside>
    {calendarSync.status !== 'idle' && <div className={`calendar-sync ${calendarSync.status}`} role="status">{calendarSync.status === 'saving' && <LoaderCircle size={15} className="spin" />}<span>{calendarSync.message}</span>{calendarSync.status !== 'saving' && <button onClick={clearCalendarSync} aria-label="알림 닫기"><X size={14} /></button>}</div>}
    {modal && <EventModal date={selectedDate} initial={editingEvent ?? undefined} onClose={() => setModal(false)} onSave={(event) => { if (editingEvent) updateEvent(editingEvent.id, event); else addEvent(event); setModal(false) }} />}
  </div>
}

function calendarInterval(month: Date) {
  return eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) })
}

function MiniCalendar({ month, selected, onSelect, onMonthChange }: { month: Date; selected: string; onSelect: (date: string) => void; onMonthChange: (amount: number) => void }) {
  return <div className="mini-calendar"><div className="mini-head"><button onClick={() => onMonthChange(-1)} aria-label="이전 달"><ChevronLeft size={14} /></button><b>{format(month, 'yyyy년 M월')}</b><button onClick={() => onMonthChange(1)} aria-label="다음 달"><ChevronRight size={14} /></button></div><div className="mini-week">{['일','월','화','수','목','금','토'].map((day) => <span key={day}>{day}</span>)}</div><div className="mini-days">{calendarInterval(month).map((day) => { const key = dateKey(day); return <button key={key} className={`${selected === key ? 'selected' : ''} ${!isSameMonth(day, month) ? 'muted' : ''}`} onClick={() => onSelect(key)}>{format(day, 'd')}</button> })}</div></div>
}

function MonthGrid({ month, events, selected, onSelect, onMove, onOpen }: { month: Date; events: CalendarEvent[]; selected: string; onSelect: (date: string) => void; onMove: (id: string, date: string) => void; onOpen: (event: CalendarEvent) => void }) {
  const days = calendarInterval(month)
  return <div className="month-grid"><div className="weekday-row">{['일','월','화','수','목','금','토'].map((day) => <span key={day}>{day}</span>)}</div><div className="date-grid" style={{ gridTemplateRows: `repeat(${days.length / 7}, 1fr)` }}>{days.map((day) => {
    const date = dateKey(day)
    const dayEvents = events.map((event) => eventOccurrenceOn(event, date)).filter((event): event is CalendarEvent => Boolean(event))
    const select = () => onSelect(date)
    return <div key={date} role="button" tabIndex={0} aria-label={`${format(day, 'M월 d일')}, 일정 ${dayEvents.length}건`} className={`date-cell ${date === selected ? 'selected' : ''} ${!isSameMonth(day, month) ? 'outside' : ''}`} onClick={select} onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && select()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onMove(event.dataTransfer.getData('text/plain'), date)}><span className="date-number">{format(day, 'd')}</span><div className="event-stack">{dayEvents.slice(0, 3).map((event) => <button type="button" draggable={event.date === date} onDragStart={(drag) => drag.dataTransfer.setData('text/plain', event.id)} onClick={(click) => { click.stopPropagation(); onOpen(event) }} key={event.id} className={`event-chip ${kindClass[event.kind]} ${event.endDate && event.endDate !== event.date ? 'multi-day' : ''}`} aria-label={`${event.title} 상세`}><time>{event.allDay ? '' : event.start}</time>{event.title}</button>)}{dayEvents.length > 3 && <small>+{dayEvents.length - 3}개 더</small>}</div></div>
  })}</div></div>
}

function AlternativeCalendarView({ mode, events, selected, onSelect }: { mode: Exclude<CalendarView, '월간'>; events: CalendarEvent[]; selected: string; onSelect: (date: string) => void }) {
  const selectedValue = parseISO(selected)
  const rangeStart = startOfWeek(selectedValue)
  const rangeEnd = endOfWeek(selectedValue)
  const filtered = mode === '일간' ? events.map((event) => eventOccurrenceOn(event, selected)).filter((event): event is CalendarEvent => Boolean(event))
    : mode === '주간' ? expandEventsBetween(events, format(rangeStart, 'yyyy-MM-dd'), format(rangeEnd, 'yyyy-MM-dd'))
      : expandEventsBetween(events, format(startOfMonth(selectedValue), 'yyyy-MM-dd'), format(endOfMonth(addMonths(selectedValue, 2)), 'yyyy-MM-dd'))
  return <div className="alternative-view"><div className="alternative-title"><CalendarDays size={21} /><span>{mode} 보기</span></div>{filtered.length ? filtered.map((event) => <button key={event.id} onClick={() => onSelect(event.date)}><i className={kindClass[event.kind]} /><time>{format(parseISO(event.date), 'M월 d일 (EEE)', { locale: ko })}{event.endDate && event.endDate !== event.date ? ` ~ ${format(parseISO(event.endDate), 'M월 d일 (EEE)', { locale: ko })}` : ''} · {event.allDay ? '하루 종일' : event.start || '시간 미정'}</time><b>{event.title}</b><ChevronRight size={15} /></button>) : <div className="calendar-empty"><CalendarDays size={28}/><b>표시할 일정이 없습니다.</b><span>다른 날짜나 필터를 선택해 보세요.</span></div>}</div>
}

function EventModal({ date, initial, onClose, onSave }: { date: string; initial?: CalendarEvent; onClose: () => void; onSave: (event: Omit<CalendarEvent, 'id'>) => void }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [eventDate, setEventDate] = useState(initial?.date ?? date)
  const [endDate, setEndDate] = useState(initial?.endDate ?? initial?.date ?? date)
  const [start, setStart] = useState(initial?.start ?? '09:00')
  const [end, setEnd] = useState(initial?.end ?? '')
  const [allDay, setAllDay] = useState(initial?.allDay ?? initial?.start === '')
  const [kind, setKind] = useState<CalendarKind>(initial?.kind ?? 'royal')
  const [important, setImportant] = useState(initial?.important ?? false)
  const initialRecurrence = parseRecurrenceRule(initial?.recurrenceRule)
  const [recurrenceFrequency, setRecurrenceFrequency] = useState(initialRecurrence.frequency ?? '')
  const [recurrenceUntil] = useState(initialRecurrence.until ?? '')
  const recurrenceRule = buildRecurrenceRule(recurrenceFrequency, recurrenceUntil) ?? ''
  const setRecurrenceRule = (value: string) => setRecurrenceFrequency(value.replace('FREQ=', '') as 'DAILY' | 'WEEKLY' | 'MONTHLY' | '')
  useEffect(() => { const listener = (event: KeyboardEvent) => event.key === 'Escape' && onClose(); document.addEventListener('keydown', listener); return () => document.removeEventListener('keydown', listener) }, [onClose])
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="event-modal-title" onSubmit={(event) => { event.preventDefault(); if (title.trim() && endDate >= eventDate) onSave({ title: title.trim(), description: description.trim(), date: eventDate, endDate, start: allDay ? '' : start, end: allDay ? undefined : end || undefined, allDay, kind, important, recurrenceRule: recurrenceRule || undefined }) }} onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">{initial ? 'EDIT SCHEDULE' : 'NEW SCHEDULE'}</span><h2 id="event-modal-title">{initial ? '일정 상세 편집' : '새 일정 만들기'}</h2></div><button type="button" aria-label="닫기" onClick={onClose}><X size={18} /></button></div><label>일정 이름<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="어떤 일정인가요?" required /></label><label>설명<textarea className="modal-textarea compact" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="일정에 필요한 내용을 적어 주세요."/></label><div className="form-row"><label>시작일<input type="date" value={eventDate} onChange={(event) => { setEventDate(event.target.value); if (endDate < event.target.value) setEndDate(event.target.value) }} /></label><label>종료일<input type="date" min={eventDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div><label className="important-check"><input type="checkbox" checked={allDay} onChange={(event) => setAllDay(event.target.checked)}/> 종일 일정</label>{!allDay && <div className="form-row"><label>시작 시간<input type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label><label>종료 시간<input type="time" value={end} min={start} onChange={(event) => setEnd(event.target.value)} /></label></div>}<label>반복<select value={recurrenceRule} onChange={(event) => setRecurrenceRule(event.target.value)}><option value="">반복 안 함</option><option value="FREQ=DAILY">매일</option><option value="FREQ=WEEKLY">매주</option><option value="FREQ=MONTHLY">매월</option></select></label><label>캘린더<select value={kind} onChange={(event) => setKind(event.target.value as CalendarKind)}>{calendarKinds.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="important-check"><input type="checkbox" checked={important} onChange={(event) => setImportant(event.target.checked)}/> 중요 일정으로 표시</label><div className="modal-actions"><button type="button" className="ghost" onClick={onClose}>취소</button><button type="submit" className="primary">{initial ? <Pencil size={15} /> : <Plus size={15} />} {initial ? '변경사항 저장' : '일정 추가'}</button></div></form></div>
}

function EmptyMini({ onCreate }: { onCreate: () => void }) { return <div className="empty-mini"><CalendarDays size={24}/><b>선택한 날의 일정이 없어요</b><button onClick={onCreate}>새 일정 추가</button></div> }
