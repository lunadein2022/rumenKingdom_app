import { supabase } from '../lib/supabase'
import type { CalendarEvent } from '../types'

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
}

const fromRow = (row: CalendarRow): CalendarEvent => ({
  id: row.id,
  title: row.title,
  description: row.description,
  date: row.event_date,
  endDate: row.end_date ?? undefined,
  start: row.all_day ? '' : row.starts_at,
  end: row.ends_at ?? undefined,
  allDay: row.all_day,
  kind: row.kind,
  important: row.important,
  recurrenceRule: row.recurrence_rule ?? undefined,
})

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
    .select('id,title,description,event_date,end_date,starts_at,ends_at,all_day,kind,important,recurrence_rule')
    .order('event_date')
    .order('starts_at')

  if (error) throw error
  return (data as CalendarRow[]).map(fromRow)
}

export async function createCalendarEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent | null> {
  if (!supabase || !(await hasAuthenticatedUser())) return null
  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      title: event.title,
      description: event.description ?? '',
      event_date: event.date,
      end_date: event.endDate ?? event.date,
      starts_at: event.allDay ? '00:00' : event.start || '09:00',
      ends_at: event.end ?? null,
      all_day: event.allDay ?? false,
      kind: event.kind,
      important: event.important ?? false,
      recurrence_rule: event.recurrenceRule ?? null,
    })
    .select('id,title,description,event_date,end_date,starts_at,ends_at,all_day,kind,important,recurrence_rule')
    .single()

  if (error) throw error
  return fromRow(data as CalendarRow)
}

export async function updateCalendarEventDate(id: string, date: string, endDate?: string): Promise<void> {
  if (!supabase || !isUuid(id) || !(await hasAuthenticatedUser())) return
  const { error } = await supabase.from('calendar_events').update({ event_date: date, end_date: endDate ?? date }).eq('id', id)
  if (error) throw error
}

export async function updateCalendarEvent(id: string, event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent | null> {
  if (!supabase || !isUuid(id) || !(await hasAuthenticatedUser())) return null
  const { data, error } = await supabase
    .from('calendar_events')
    .update({
      title: event.title,
      description: event.description ?? '',
      event_date: event.date,
      end_date: event.endDate ?? event.date,
      starts_at: event.allDay ? '00:00' : event.start || '09:00',
      ends_at: event.end ?? null,
      all_day: event.allDay ?? false,
      kind: event.kind,
      important: event.important ?? false,
      recurrence_rule: event.recurrenceRule ?? null,
    })
    .eq('id', id)
    .select('id,title,description,event_date,end_date,starts_at,ends_at,all_day,kind,important,recurrence_rule')
    .single()

  if (error) throw error
  return fromRow(data as CalendarRow)
}

export async function removeCalendarEvent(id: string): Promise<void> {
  if (!supabase || !isUuid(id) || !(await hasAuthenticatedUser())) return
  const { error } = await supabase.from('calendar_events').delete().eq('id', id)
  if (error) throw error
}
