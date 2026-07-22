import { addDays, format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import type { CalendarEvent, Quest } from '../types'
import { currentServiceTimePreferences, serviceDate } from '../lib/serviceTime'
import { eventOccurrenceOn } from '../lib/recurrence'
import { isQuestOnDate } from '../lib/questSchedule'

type ReminderDraft = { scheduledFor: string; title: string; body: string; path: string }
const MAX_REMINDERS = 64
const LOOKAHEAD_DAYS = 365

export async function scheduleEventReminders(event: CalendarEvent) {
  if (!supabase || !isUuid(event.id)) return false
  const today = serviceDate()
  const reminders: ReminderDraft[] = []
  for (let offset = 0; offset <= LOOKAHEAD_DAYS && reminders.length < MAX_REMINDERS; offset += 1) {
    const date = format(addDays(parseISO(today), offset), 'yyyy-MM-dd')
    const occurrence = eventOccurrenceOn(event, date)
    if (!occurrence || occurrence.date !== date) continue
    const scheduledFor = reminderInstant(date, occurrence.start || '09:00', occurrence.allDay || !occurrence.start ? 0 : 10)
    if (scheduledFor && new Date(scheduledFor).getTime() > Date.now() + 30_000) reminders.push({
      scheduledFor, title: '왕실 일정 알림', body: occurrence.title, path: `/calendar/event/${event.id}`,
    })
    if (!event.recurrenceRule) break
  }
  return replaceReminders('calendar_event', event.id, reminders)
}

export async function scheduleQuestReminders(quest: Quest, completedDates: Iterable<string> = []) {
  if (!supabase || !isUuid(quest.id)) return false
  if (quest.done && quest.type !== 'daily' && !quest.recurrenceRule) return replaceReminders('quest', quest.id, [])
  const today = serviceDate()
  const skippedDates = new Set(completedDates)
  const reminders: ReminderDraft[] = []
  for (let offset = 0; offset <= LOOKAHEAD_DAYS && reminders.length < MAX_REMINDERS; offset += 1) {
    const date = format(addDays(parseISO(today), offset), 'yyyy-MM-dd')
    if (!isQuestOnDate(quest, date)) continue
    if (skippedDates.has(date)) continue
    const scheduledFor = reminderInstant(date, quest.scheduledTime || '09:00', quest.scheduledTime ? 30 : 0)
    if (scheduledFor && new Date(scheduledFor).getTime() > Date.now() + 30_000) reminders.push({
      scheduledFor, title: '오늘의 퀘스트', body: quest.title, path: '/office',
    })
    if (quest.type !== 'daily' && !quest.recurrenceRule) break
  }
  return replaceReminders('quest', quest.id, reminders)
}

export async function cancelReminders(entityType: 'calendar_event' | 'quest', entityId: string) {
  if (!supabase || !isUuid(entityId)) return false
  const { error } = await supabase.rpc('cancel_my_reminders', { p_entity_type: entityType, p_entity_id: entityId })
  if (error) throw error
  return true
}

async function replaceReminders(entityType: 'calendar_event' | 'quest', entityId: string, reminders: ReminderDraft[]) {
  const { error } = await supabase!.rpc('replace_my_reminders', {
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_reminders: reminders.map((item) => ({ scheduled_for: item.scheduledFor, title: item.title, body: item.body, path: item.path })),
  })
  if (error) throw error
  return true
}

/** Converts a wall-clock date in the account timezone to UTC after reminder lead time and quiet hours. */
function reminderInstant(date: string, time: string, leadMinutes: number) {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null
  const wall = new Date(Date.UTC(year, month - 1, day, hour, minute))
  wall.setUTCMinutes(wall.getUTCMinutes() - leadMinutes)
  if (wall.getUTCHours() >= 22) wall.setUTCHours(21, 50, 0, 0)
  else if (wall.getUTCHours() < 8) { wall.setUTCDate(wall.getUTCDate() - 1); wall.setUTCHours(21, 50, 0, 0) }
  const wallDate = wall.toISOString().slice(0, 10)
  const wallTime = wall.toISOString().slice(11, 16)
  return zonedWallClockToUtc(wallDate, wallTime, currentServiceTimePreferences().timeZone).toISOString()
}

function zonedWallClockToUtc(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const target = Date.UTC(year, month - 1, day, hour, minute)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  })
  const offsetAt = (instant: number) => {
    const parts = formatter.formatToParts(new Date(instant))
    const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0)
    return Date.UTC(read('year'), read('month') - 1, read('day'), read('hour'), read('minute')) - instant
  }
  let instant = target - offsetAt(target)
  instant = target - offsetAt(instant)
  return new Date(instant)
}

function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) }
