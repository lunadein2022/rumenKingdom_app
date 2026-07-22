import { useMemo } from 'react'
import { buildRecurrenceRule, parseRecurrenceRule, weekdayCode, type RecurrenceFrequency, type WeekdayCode } from '../lib/recurrence'

const weekdays: { code: WeekdayCode; label: string }[] = [
  { code: 'MO', label: '월' }, { code: 'TU', label: '화' }, { code: 'WE', label: '수' },
  { code: 'TH', label: '목' }, { code: 'FR', label: '금' }, { code: 'SA', label: '토' }, { code: 'SU', label: '일' },
]

const ordinals = [
  { value: 1, label: '첫 번째' }, { value: 2, label: '두 번째' }, { value: 3, label: '세 번째' },
  { value: 4, label: '네 번째' }, { value: -1, label: '마지막' },
]

function monthlyPosition(anchorDate: string) {
  const date = new Date(`${anchorDate}T12:00:00`)
  const nextWeek = new Date(date)
  nextWeek.setDate(date.getDate() + 7)
  return nextWeek.getMonth() !== date.getMonth() ? -1 : Math.ceil(date.getDate() / 7)
}

function monthDays(month: number) {
  return new Date(2024, month, 0).getDate()
}

export function RecurrenceEditor({ value, anchorDate, onChange }: { value?: string; anchorDate: string; onChange: (value: string) => void }) {
  const parsed = useMemo(() => parseRecurrenceRule(value), [value])
  const frequency = parsed.frequency ?? ''
  const anchorWeekday = weekdayCode(anchorDate)
  const anchor = new Date(`${anchorDate}T12:00:00`)
  const byDay = parsed.byDay.length ? parsed.byDay : [anchorWeekday]
  const bySetPos = parsed.bySetPos ?? monthlyPosition(anchorDate)
  const byMonth = parsed.byMonth ?? anchor.getMonth() + 1
  const byMonthDay = Math.min(parsed.byMonthDay ?? anchor.getDate(), monthDays(byMonth))

  const update = (nextFrequency: RecurrenceFrequency | '', overrides: {
    byDay?: WeekdayCode[]; bySetPos?: number; byMonth?: number; byMonthDay?: number; until?: string
  } = {}) => {
    if (!nextFrequency) return onChange('')
    const nextDays = overrides.byDay ?? byDay
    const options = nextFrequency === 'WEEKLY' ? { byDay: nextDays }
      : nextFrequency === 'MONTHLY' ? { byDay: [nextDays[0] ?? anchorWeekday], bySetPos: overrides.bySetPos ?? bySetPos }
        : nextFrequency === 'YEARLY' ? { byMonth: overrides.byMonth ?? byMonth, byMonthDay: overrides.byMonthDay ?? byMonthDay }
          : {}
    onChange(buildRecurrenceRule(nextFrequency, overrides.until ?? parsed.until, options) ?? '')
  }

  const toggleWeekday = (day: WeekdayCode) => {
    const next = byDay.includes(day) ? byDay.filter((item) => item !== day) : weekdays.map((item) => item.code).filter((item) => [...byDay, day].includes(item))
    update('WEEKLY', { byDay: next.length ? next : [day] })
  }

  return <fieldset className="recurrence-editor">
    <legend>반복</legend>
    <label>반복 방식
      <select value={frequency} onChange={(event) => update(event.target.value as RecurrenceFrequency | '')}>
        <option value="">반복 안 함</option>
        <option value="DAILY">매일</option>
        <option value="WEEKLY">매주 · 요일 선택</option>
        <option value="MONTHLY">매월 · 순서와 요일</option>
        <option value="YEARLY">매년 · 월과 일</option>
      </select>
    </label>
    {frequency === 'WEEKLY' && <div className="recurrence-option"><span>반복 요일</span><div className="recurrence-weekdays">{weekdays.map((day) => <button key={day.code} type="button" className={byDay.includes(day.code) ? 'active' : ''} aria-pressed={byDay.includes(day.code)} onClick={() => toggleWeekday(day.code)}>{day.label}</button>)}</div></div>}
    {frequency === 'MONTHLY' && <div className="recurrence-option"><span>매월 반복</span><div className="recurrence-inline"><select aria-label="월간 반복 순서" value={bySetPos} onChange={(event) => update('MONTHLY', { bySetPos: Number(event.target.value) })}>{ordinals.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><select aria-label="월간 반복 요일" value={byDay[0]} onChange={(event) => update('MONTHLY', { byDay: [event.target.value as WeekdayCode] })}>{weekdays.map((day) => <option key={day.code} value={day.code}>{day.label}요일</option>)}</select></div></div>}
    {frequency === 'YEARLY' && <div className="recurrence-option"><span>매년 반복</span><div className="recurrence-inline"><select aria-label="연간 반복 월" value={byMonth} onChange={(event) => { const month = Number(event.target.value); update('YEARLY', { byMonth: month, byMonthDay: Math.min(byMonthDay, monthDays(month)) }) }}>{Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>{month}월</option>)}</select><select aria-label="연간 반복 일" value={byMonthDay} onChange={(event) => update('YEARLY', { byMonthDay: Number(event.target.value) })}>{Array.from({ length: monthDays(byMonth) }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{day}일</option>)}</select></div></div>}
    {frequency && <label>반복 종료일 <small>선택하지 않으면 계속 반복됩니다.</small><input type="date" min={anchorDate} value={parsed.until ?? ''} onChange={(event) => update(frequency, { until: event.target.value })}/></label>}
  </fieldset>
}
