import { supabase } from '../lib/supabase'
import { hourMinute } from '../lib/clockTime'
import type { CalendarEvent } from '../types'
import { applySyncMutation, rememberSyncRevision } from '../lib/syncEngine'

type CalendarRow = {
  id: string
  title: string
  description: string
  event_date: string
  end_date: string | null
  starts_at: string
  ends_at: string | null
  all_day: boolean
  kind: CalendarEvent['kind']
  important: boolean
  recurrence_rule: string | null
  revision: number
}

const fromRow = (row: CalendarRow): CalendarEvent => {
  rememberSyncRevision('calendar_event', row.id, row.revision)
  return ({
  id: row.id,
  revision: row.revision,
  title: row.title,
  description: row.description,
  date: row.event_date,
  endDate: row.end_date ?? undefined,
  start: row.all_day ? '' : hourMinute(row.starts_at) ?? '',
  end: hourMinute(row.ends_at),
  allDay: row.all_day,
  kind: row.kind,
  important: row.important,
  recurrenceRule: row.recurrence_rule ?? undefined,
  })
}

async function hasAuthenticatedUser(): Promise<boolean> {
  if (!supabase) return false
  const { data } = await supabase.auth.getSession()
  return Boolean(data.session?.user)
}

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

export async function listCalendarEvents(): Promise<CalendarEvent[] | null> {
  if (!supabase || !(await hasAuthenticatedUser())) return null
  const { data, error } = await supabase
    .from('calendar_events')
    .select('id,title,description,event_date,end_date,starts_at,ends_at,all_day,kind,important,recurrence_rule,revision')
    .order('event_date')
    .order('starts_at')

  if (error) throw error
  return (data as CalendarRow[]).map(fromRow)
}

export async function createCalendarEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent | null> {
  if (!supabase || !(await hasAuthenticatedUser())) return null
  const id = crypto.randomUUID()
  const result = await applySyncMutation({ entityType: 'calendar_event', operation: 'create', recordId: id, payload: {
      title: event.title,
      description: event.description ?? '',
      event_date: event.date,
      end_date: event.endDate ?? event.date,
      starts_at: event.allDay ? '00:00' : hourMinute(event.start) || '09:00',
      ends_at: hourMinute(event.end) ?? null,
      all_day: event.allDay ?? false,
      kind: event.kind,
      important: event.important ?? false,
      recurrence_rule: event.recurrenceRule ?? null,
  } })
  const record = 'record' in result ? result.record as CalendarRow | undefined : undefined
  return record ? fromRow(record) : { ...event, id, revision: 1 }
}

export async function updateCalendarEventDate(id: string, date: string, endDate?: string): Promise<void> {
  if (!supabase || !isUuid(id) || !(await hasAuthenticatedUser())) return
  await applySyncMutation({ entityType: 'calendar_event', operation: 'update', recordId: id, payload: { event_date: date, end_date: endDate ?? date } })
}

export async function updateCalendarEvent(id: string, event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent | null> {
  if (!supabase || !isUuid(id) || !(await hasAuthenticatedUser())) return null
  const result = await applySyncMutation({ entityType: 'calendar_event', operation: 'update', recordId: id, expectedRevision: event.revision, payload: {
      title: event.title,
      description: event.description ?? '',
      event_date: event.date,
      end_date: event.endDate ?? event.date,
      starts_at: event.allDay ? '00:00' : hourMinute(event.start) || '09:00',
      ends_at: hourMinute(event.end) ?? null,
      all_day: event.allDay ?? false,
      kind: event.kind,
      important: event.important ?? false,
      recurrence_rule: event.recurrenceRule ?? null,
  } })
  const record = 'record' in result ? result.record as CalendarRow | undefined : undefined
  return record ? fromRow(record) : { ...event, id }
}

export async function removeCalendarEvent(id: string): Promise<void> {
  if (!supabase || !isUuid(id) || !(await hasAuthenticatedUser())) return
  await applySyncMutation({ entityType: 'calendar_event', operation: 'delete', recordId: id })
}
