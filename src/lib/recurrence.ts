import { addDays, differenceInCalendarDays, eachDayOfInterval, format, parseISO } from 'date-fns'
import type { CalendarEvent, Quest } from '../types'

type ParsedRule = { frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY'; until?: string }

export function parseRecurrenceRule(value?: string): ParsedRule {
  const fields = Object.fromEntries((value ?? '').split(';').map((part) => part.split('=')))
  const rawUntil = fields.UNTIL
  return { frequency: fields.FREQ as ParsedRule['frequency'], until: rawUntil ? `${rawUntil.slice(0, 4)}-${rawUntil.slice(4, 6)}-${rawUntil.slice(6, 8)}` : undefined }
}

export function buildRecurrenceRule(frequency: string, until?: string) {
  if (!frequency) return undefined
  return `FREQ=${frequency}${until ? `;UNTIL=${until.replaceAll('-', '')}` : ''}`
}

function isOccurrenceStart(event: CalendarEvent, candidate: string) {
  const rule = parseRecurrenceRule(event.recurrenceRule)
  if (!rule.frequency || candidate < event.date || (rule.until && candidate > rule.until)) return false
  const diff = differenceInCalendarDays(parseISO(candidate), parseISO(event.date))
  if (rule.frequency === 'DAILY') return true
  if (rule.frequency === 'WEEKLY') return diff % 7 === 0
  const start = parseISO(event.date)
  const value = parseISO(candidate)
  return value.getDate() === start.getDate() && diff >= 0
}

export function eventOccurrenceOn(event: CalendarEvent, date: string): CalendarEvent | null {
  if (event.date <= date && (event.endDate ?? event.date) >= date) return event
  if (!event.recurrenceRule || date < event.date) return null
  const duration = Math.max(0, differenceInCalendarDays(parseISO(event.endDate ?? event.date), parseISO(event.date)))
  for (let offset = 0; offset <= duration; offset += 1) {
    const occurrenceStart = format(addDays(parseISO(date), -offset), 'yyyy-MM-dd')
    if (isOccurrenceStart(event, occurrenceStart)) return { ...event, date: occurrenceStart, endDate: format(addDays(parseISO(occurrenceStart), duration), 'yyyy-MM-dd') }
  }
  return null
}

/** 반복 퀘스트가 특정 날짜(date, YYYY-MM-DD)에 해당하는지 여부. anchorFallback은 scheduledDate가 없을 때 기준일. */
export function questOccursOn(quest: Quest, date: string, anchorFallback: string): boolean {
  if (!quest.recurrenceRule) return quest.scheduledDate === date
  const rule = parseRecurrenceRule(quest.recurrenceRule)
  if (!rule.frequency) return quest.scheduledDate === date
  const anchor = quest.scheduledDate || anchorFallback
  if (date < anchor || (rule.until && date > rule.until)) return false
  const diff = differenceInCalendarDays(parseISO(date), parseISO(anchor))
  if (diff < 0) return false
  if (rule.frequency === 'DAILY') return true
  if (rule.frequency === 'WEEKLY') return diff % 7 === 0
  return parseISO(date).getDate() === parseISO(anchor).getDate()
}

/** 반복 규칙을 사람이 읽는 짧은 라벨로. */
export function recurrenceLabel(rule?: string): string {
  const parsed = parseRecurrenceRule(rule)
  if (!parsed.frequency) return ''
  const base = parsed.frequency === 'DAILY' ? '매일' : parsed.frequency === 'WEEKLY' ? '매주' : '매월'
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
