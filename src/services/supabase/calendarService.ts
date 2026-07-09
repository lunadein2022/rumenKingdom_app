import { supabaseTables } from "./schemaMap";
import type { CalendarEventRow, CalendarReminderRow } from "./types";

export type CalendarEventInsert = Omit<CalendarEventRow, "id" | "created_at" | "updated_at" | "user_id">;

export async function getCalendarEventsByRange(_startDate: string, _endDate: string): Promise<CalendarEventRow[]> {
  // TODO: Replace with Supabase Query
  // supabase.from(supabaseTables.calendarEvents).select("*").gte("start_at", startDate).lte("start_at", endDate)
  void supabaseTables.calendarEvents;
  return [];
}

export async function createCalendarEvent(_input: CalendarEventInsert): Promise<CalendarEventRow | null> {
  // TODO: Replace with Supabase Query
  // supabase.from(supabaseTables.calendarEvents).insert(input).select().single()
  return null;
}

export async function scheduleCalendarReminder(_eventId: string, _remindAt: string): Promise<CalendarReminderRow | null> {
  // TODO: Replace with Supabase Query
  // supabase.from(supabaseTables.calendarReminders).insert({ event_id: eventId, remind_at: remindAt })
  void supabaseTables.calendarReminders;
  return null;
}
