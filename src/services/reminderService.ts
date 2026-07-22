import { subMinutes } from 'date-fns'
import { supabase } from '../lib/supabase'
import type { CalendarEvent } from '../types'
import type { Quest } from '../types'
import { serviceDate } from '../lib/serviceTime'

export async function scheduleDefaultEventReminder(event: CalendarEvent) {
  if (!supabase || !isUuid(event.id)) return false
  const eventTime = event.allDay || !event.start ? '09:00' : event.start
  const startsAt = new Date(`${event.date}T${eventTime}:00`)
  if (!Number.isFinite(startsAt.getTime())) return false
  const reminder = quietHoursSafe(subMinutes(startsAt, event.allDay || !event.start ? 0 : 10))
  if (reminder.getTime() < Date.now() - 5 * 60 * 1000) return false
  const { error } = await supabase.rpc('schedule_my_reminder', {
    p_entity_type: 'calendar_event',
    p_entity_id: event.id,
    p_title: event.title,
    p_scheduled_for: reminder.toISOString(),
  })
  if (error) throw error
  return true
}

export async function scheduleDefaultQuestReminder(quest: Quest) {
  if (!supabase || !isUuid(quest.id)) return false
  const date = quest.type === 'daily' ? serviceDate() : quest.scheduledDate
  if (!date || (quest.type === 'daily' && quest.scheduledDate && date > quest.scheduledDate)) return false
  const hasDeadlineTime = Boolean(quest.scheduledTime)
  const deadline = new Date(`${date}T${quest.scheduledTime || '09:00'}:00`)
  if (!Number.isFinite(deadline.getTime())) return false
  const reminder = quietHoursSafe(hasDeadlineTime ? subMinutes(deadline, 30) : deadline)
  if (reminder.getTime() < Date.now() - 5 * 60 * 1000) return false
  const { error } = await supabase.rpc('schedule_my_reminder', {
    p_entity_type: 'quest', p_entity_id: quest.id, p_title: quest.title, p_scheduled_for: reminder.toISOString(),
  })
  if (error) throw error
  return true
}

function quietHoursSafe(value: Date) {
  const result = new Date(value)
  if (result.getHours() >= 22) { result.setHours(21, 50, 0, 0) }
  else if (result.getHours() < 8) { result.setDate(result.getDate() - 1); result.setHours(21, 50, 0, 0) }
  return result
}

function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) }
