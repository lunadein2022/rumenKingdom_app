import { useMemo, useState } from "react";
import {
  applyLinkedQuestId,
  completeEvent,
  createEvent,
  createEventWithLinkedQuest,
  deleteEvent,
  getEventsByDay,
  getEventsByRange,
  getUpcomingEvents,
  updateEvent,
} from "../services/calendarService";
import type { CalendarEvent, CalendarEventInput } from "../types/calendar.types";

export function useCalendarEvents(initialEvents: CalendarEvent[]) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);

  const upcomingEvents = useMemo(() => getUpcomingEvents(events), [events]);

  return {
    events,
    upcomingEvents,
    getEventsByRange: (startDate: string, endDate: string) => getEventsByRange(events, startDate, endDate),
    getEventsByDay: (date: string) => getEventsByDay(events, date),
    createEvent: (input: CalendarEventInput) => setEvents((current) => createEvent(current, input)),
    updateEvent: (id: string, input: Partial<CalendarEventInput>) =>
      setEvents((current) => updateEvent(current, id, input)),
    deleteEvent: (id: string) => setEvents((current) => deleteEvent(current, id)),
    completeEvent: (id: string) => setEvents((current) => completeEvent(current, id)),
    createEventWithLinkedQuest: (input: CalendarEventInput): CalendarEvent | null => {
      let resultEvent: CalendarEvent | null = null;
      setEvents((current) => {
        const result = createEventWithLinkedQuest(current, input);
        resultEvent = result.result.event;
        return result.events;
      });
      return resultEvent;
    },
    applyLinkedQuestId: (eventId: string, questId: string) =>
      setEvents((current) => applyLinkedQuestId(current, eventId, questId)),
  };
}
