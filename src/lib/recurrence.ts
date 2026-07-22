import { addDays, differenceInCalendarDays, eachDayOfInterval, format, parseISO } from 'date-fns'
import type { CalendarEvent, Quest } from '../types'

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
export type WeekdayCode = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'
export type ParsedRule = {
  frequency?: RecurrenceFrequency
  until?: string
  byDay: WeekdayCode[]
  bySetPos?: number
  byMonth?: number
  byMonthDay?: number
}

const weekdayByIndex: WeekdayCode[] = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
const weekdayLabels: Record<WeekdayCode, string> = { MO: '월', TU: '화', WE: '수', TH: '목', FR: '금', SA: '토', SU: '일' }
const validWeekdays = new Set<WeekdayCode>(weekdayByIndex)

export function weekdayCode(date: string): WeekdayCode {
  return weekdayByIndex[parseISO(date).getDay()]
}

export function parseRecurrenceRule(value?: string): ParsedRule {
  const fields = Object.fromEntries((value ?? '').split(';').filter(Boolean).map((part) => {
    const split = part.indexOf('=')
    return split < 0 ? [part, ''] : [part.slice(0, split), part.slice(split + 1)]
  }))
  const rawUntil = fields.UNTIL
  const frequency = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(fields.FREQ) ? fields.FREQ as RecurrenceFrequency : undefined
  const byDay = (fields.BYDAY ?? '').split(',').filter((item): item is WeekdayCode => validWeekdays.has(item as WeekdayCode))
  const integer = (value?: string) => value && /^-?\d+$/.test(value) ? Number(value) : undefined
  return {
    frequency,
    until: rawUntil && /^\d{8}$/.test(rawUntil) ? `${rawUntil.slice(0, 4)}-${rawUntil.slice(4, 6)}-${rawUntil.slice(6, 8)}` : undefined,
    byDay,
    bySetPos: integer(fields.BYSETPOS),
    byMonth: integer(fields.BYMONTH),
    byMonthDay: integer(fields.BYMONTHDAY),
  }
}

export function buildRecurrenceRule(
  frequency: string,
  until?: string,
  options: { byDay?: WeekdayCode[]; bySetPos?: number; byMonth?: number; byMonthDay?: number } = {},
) {
  if (!frequency) return undefined
  const parts = [`FREQ=${frequency}`]
  if (options.byDay?.length) parts.push(`BYDAY=${options.byDay.join(',')}`)
  if (options.bySetPos) parts.push(`BYSETPOS=${options.bySetPos}`)
  if (options.byMonth) parts.push(`BYMONTH=${options.byMonth}`)
  if (options.byMonthDay) parts.push(`BYMONTHDAY=${options.byMonthDay}`)
  if (until) parts.push(`UNTIL=${until.replaceAll('-', '')}`)
  return parts.join(';')
}

export function replaceRecurrenceUntil(rule: string | undefined, until?: string) {
  if (!rule) return undefined
  const kept = rule.split(';').filter((part) => part && !part.startsWith('UNTIL='))
  if (until) kept.push(`UNTIL=${until.replaceAll('-', '')}`)
  return kept.join(';')
}

function isMonthlyWeekday(candidate: string, byDay: WeekdayCode[], bySetPos?: number) {
  if (!byDay.length || !byDay.includes(weekdayCode(candidate))) return false
  const value = parseISO(candidate)
  if (bySetPos === -1) return addDays(value, 7).getMonth() !== value.getMonth()
  const ordinal = Math.floor((value.getDate() - 1) / 7) + 1
  return ordinal === (bySetPos ?? 1)
}

function isOccurrenceStart(event: CalendarEvent, candidate: string) {
  const rule = parseRecurrenceRule(event.recurrenceRule)
  if (!rule.frequency || candidate < event.date || (rule.until && candidate > rule.until)) return false
  const diff = differenceInCalendarDays(parseISO(candidate), parseISO(event.date))
  if (rule.frequency === 'DAILY') return true
  if (rule.frequency === 'WEEKLY') return rule.byDay.length ? rule.byDay.includes(weekdayCode(candidate)) : diff % 7 === 0
  if (rule.frequency === 'MONTHLY') {
    if (rule.byDay.length) return isMonthlyWeekday(candidate, rule.byDay, rule.bySetPos)
    return parseISO(candidate).getDate() === parseISO(event.date).getDate()
  }
  const start = parseISO(event.date)
  const value = parseISO(candidate)
  return value.getMonth() + 1 === (rule.byMonth ?? start.getMonth() + 1)
    && value.getDate() === (rule.byMonthDay ?? start.getDate())
}

export function eventOccurrenceOn(event: CalendarEvent, date: string): CalendarEvent | null {
  if (event.date <= date && (event.endDate ?? event.date) >= date) {
    if (!event.recurrenceRule) return event
    const exception = event.recurrenceExceptions?.[event.date]
    if (exception?.cancelled) return null
    const occurrence = { ...event, seriesDate: event.date }
    return exception?.replacement ? { ...occurrence, ...exception.replacement, id: event.id, seriesDate: event.date } : occurrence
  }
  if (!event.recurrenceRule || date < event.date) return null
  const duration = Math.max(0, differenceInCalendarDays(parseISO(event.endDate ?? event.date), parseISO(event.date)))
  for (let offset = 0; offset <= duration; offset += 1) {
    const occurrenceStart = format(addDays(parseISO(date), -offset), 'yyyy-MM-dd')
    if (isOccurrenceStart(event, occurrenceStart)) {
      const exception = event.recurrenceExceptions?.[occurrenceStart]
      if (exception?.cancelled) return null
      const occurrence = { ...event, date: occurrenceStart, endDate: format(addDays(parseISO(occurrenceStart), duration), 'yyyy-MM-dd'), seriesDate: event.date }
      return exception?.replacement ? { ...occurrence, ...exception.replacement, id: event.id, seriesDate: event.date } : occurrence
    }
  }
  return null
}

export function eventOccurrencesOnDate(events: CalendarEvent[], date: string) {
  return events.map((event) => eventOccurrenceOn(event, date)).filter((event): event is CalendarEvent => Boolean(event))
}

/** 일일퀘스트는 생성일부터 마감일까지 매일, 그 외 퀘스트는 저장된 반복 규칙이나 지정일을 따른다. */
export function questOccursOn(quest: Quest, date: string, anchorFallback: string): boolean {
  if (!quest.recurrenceRule) {
    if (quest.type === 'daily') return date >= anchorFallback && (!quest.scheduledDate || date <= quest.scheduledDate)
    return quest.scheduledDate === date
  }
  const rule = parseRecurrenceRule(quest.recurrenceRule)
  if (!rule.frequency) return quest.scheduledDate === date
  const anchor = quest.type === 'daily' ? anchorFallback : quest.scheduledDate || anchorFallback
  if (date < anchor || (rule.until && date > rule.until)) return false
  const diff = differenceInCalendarDays(parseISO(date), parseISO(anchor))
  if (diff < 0) return false
  if (rule.frequency === 'DAILY') return true
  if (rule.frequency === 'WEEKLY') return rule.byDay.length ? rule.byDay.includes(weekdayCode(date)) : diff % 7 === 0
  if (rule.frequency === 'MONTHLY') {
    if (rule.byDay.length) return isMonthlyWeekday(date, rule.byDay, rule.bySetPos)
    return parseISO(date).getDate() === parseISO(anchor).getDate()
  }
  const anchorDate = parseISO(anchor)
  const value = parseISO(date)
  return value.getMonth() + 1 === (rule.byMonth ?? anchorDate.getMonth() + 1)
    && value.getDate() === (rule.byMonthDay ?? anchorDate.getDate())
}

/** 반복 규칙을 사람이 읽는 짧은 라벨로. */
export function recurrenceLabel(rule?: string): string {
  const parsed = parseRecurrenceRule(rule)
  if (!parsed.frequency) return ''
  let base = '매일'
  if (parsed.frequency === 'WEEKLY') base = parsed.byDay.length ? `매주 ${parsed.byDay.map((day) => weekdayLabels[day]).join('·')}` : '매주'
  if (parsed.frequency === 'MONTHLY') {
    const ordinal = parsed.bySetPos === -1 ? '마지막' : `${parsed.bySetPos ?? 1}번째`
    base = parsed.byDay.length ? `매월 ${ordinal} ${weekdayLabels[parsed.byDay[0]]}요일` : '매월'
  }
  if (parsed.frequency === 'YEARLY') base = parsed.byMonth && parsed.byMonthDay ? `매년 ${parsed.byMonth}월 ${parsed.byMonthDay}일` : '매년'
  return parsed.until ? `${base} · ~${parsed.until}` : base
}

export function expandEventsBetween(events: CalendarEvent[], start: string, end: string) {
  const occurrences: CalendarEvent[] = []
  for (const day of eachDayOfInterval({ start: parseISO(start), end: parseISO(end) })) {
    const date = format(day, 'yyyy-MM-dd')
    for (const event of events) {
      const occurrence = eventOccurrenceOn(event, date)
      if (occurrence && occurrence.date === date) occurrences.push(occurrence)
    }
  }
  return occurrences
}
