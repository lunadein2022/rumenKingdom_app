import { newId } from "../../../app/ids";
import type {
  CalendarEvent,
  CalendarEventInput,
  CalendarLinkedQuestResult,
} from "../types/calendar.types";

function dateOnly(value: string) {
  return value.slice(0, 10);
}

function toTime(value: string) {
  return new Date(value).getTime();
}

// "8월 19일부터 3일간 가족여행" 같은 기간 일정은 startAt~endAt 여러 날에 걸칩니다.
// 이 함수는 특정 날짜(date, YYYY-MM-DD)가 이벤트가 걸쳐 있는 기간 안에 포함되는지
// 확인합니다. endAt이 없거나 startAt과 같은 날이면 기존처럼 하루짜리 이벤트입니다.
export function isDateWithinEvent(event: CalendarEvent, date: string) {
  const startDate = dateOnly(event.startAt);
  const endDate = event.endAt ? dateOnly(event.endAt) : startDate;
  if (endDate <= startDate) return startDate === date;
  return date >= startDate && date <= endDate;
}

export function isMultiDayEvent(event: CalendarEvent) {
  if (!event.endAt) return false;
  return dateOnly(event.endAt) > dateOnly(event.startAt);
}

export function buildCalendarEvent(input: CalendarEventInput): CalendarEvent {
  const now = new Date().toISOString();
  return {
    id: newId(),
    title: input.title,
    description: input.description ?? "",
    startAt: input.startAt,
    endAt: input.endAt,
    location: input.location,
    category: input.category,
    priority: input.priority ?? "medium",
    isAllDay: input.isAllDay ?? false,
    reminderMinutes: input.reminderMinutes ?? null,
    reminderSentAt: null,
    linkedQuestId: input.linkedQuestId ?? null,
    status: "scheduled",
    createdBy: input.createdBy ?? "user",
    createdAt: now,
    updatedAt: now,
  };
}

export function getEventsByRange(events: CalendarEvent[], startDate: string, endDate: string) {
  // TODO: Replace with Supabase Query
  const start = toTime(`${startDate}T00:00:00`);
  const end = toTime(`${endDate}T23:59:59`);
  return events
    .filter((event) => event.status !== "cancelled")
    .filter((event) => {
      const time = toTime(event.startAt);
      return time >= start && time <= end;
    })
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export function getEventsByDay(events: CalendarEvent[], date: string) {
  // TODO: Replace with Supabase Query
  // 여러 날짜에 걸친 일정(여행 등)은 시작일뿐 아니라 걸쳐 있는 모든 날에 조회되어야 합니다.
  return events
    .filter((event) => event.status !== "cancelled" && isDateWithinEvent(event, date))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export function getUpcomingEvents(events: CalendarEvent[], nowIso = new Date().toISOString().slice(0, 19)) {
  // TODO: Replace with Supabase Query
  const now = toTime(nowIso);
  return events
    .filter((event) => event.status === "scheduled" && toTime(event.startAt) >= now)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export function getEventsForDiary(events: CalendarEvent[], date: string) {
  // TODO: Replace with Supabase Query
  return getEventsByDay(events, date).filter((event) => event.status !== "cancelled");
}

export function getLibraryEvents(events: CalendarEvent[]) {
  // TODO: Replace with Supabase Query
  return events.filter((event) => event.status === "completed" || event.status === "cancelled");
}

export function createEvent(events: CalendarEvent[], input: CalendarEventInput) {
  // TODO: Replace with Supabase Query
  return [buildCalendarEvent(input), ...events];
}

export function updateEvent(events: CalendarEvent[], id: string, input: Partial<CalendarEventInput>) {
  // TODO: Replace with Supabase Query
  const now = new Date().toISOString();
  return events.map((event) =>
    event.id === id
      ? {
          ...event,
          ...input,
          reminderMinutes: input.reminderMinutes === undefined ? event.reminderMinutes : input.reminderMinutes,
          updatedAt: now,
        }
      : event,
  );
}

export function deleteEvent(events: CalendarEvent[], id: string) {
  // TODO: Replace with Supabase Query
  const now = new Date().toISOString();
  return events.map((event) =>
    event.id === id ? { ...event, status: "cancelled" as const, updatedAt: now } : event,
  );
}

export function completeEvent(events: CalendarEvent[], id: string) {
  // TODO: Replace with Supabase Query
  const now = new Date().toISOString();
  return events.map((event) =>
    event.id === id ? { ...event, status: "completed" as const, updatedAt: now } : event,
  );
}

export function createEventWithLinkedQuest(
  events: CalendarEvent[],
  input: CalendarEventInput,
): { events: CalendarEvent[]; result: CalendarLinkedQuestResult } {
  // TODO: Replace with Supabase Query and linked quest transaction
  const event = buildCalendarEvent({ ...input, category: input.category ?? "quest" });
  return {
    events: [event, ...events],
    result: {
      event,
      questTitle: event.title,
    },
  };
}

export function applyLinkedQuestId(events: CalendarEvent[], eventId: string, questId: string) {
  // TODO: Replace with Supabase Query
  return events.map((event) =>
    event.id === eventId ? { ...event, linkedQuestId: questId, updatedAt: new Date().toISOString() } : event,
  );
}
