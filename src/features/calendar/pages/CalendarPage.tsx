import { useMemo, useState } from "react";
import { Badge } from "../../../components/design-system/Badge";
import type { CalendarEvent, CalendarEventInput, CalendarViewMode } from "../types/calendar.types";
import { CalendarDayView } from "../components/CalendarDayView";
import { CalendarEventForm } from "../components/CalendarEventForm";
import { CalendarMonthView } from "../components/CalendarMonthView";
import { CalendarReminderPanel } from "../components/CalendarReminderPanel";
import { CalendarTimeline } from "../components/CalendarTimeline";
import { getEventsByDay } from "../services/calendarService";

interface CalendarPageProps {
  events: CalendarEvent[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onCreateEvent: (input: CalendarEventInput, linkQuest: boolean) => void;
  onCompleteEvent: (id: string) => void;
  onCancelEvent: (id: string) => void;
}

const viewTabs: Array<{ key: CalendarViewMode; label: string }> = [
  { key: "month", label: "월간" },
  { key: "day", label: "하루" },
  { key: "timeline", label: "시간순" },
];

export function CalendarPage({
  events,
  selectedDate,
  onSelectDate,
  onCreateEvent,
  onCompleteEvent,
  onCancelEvent,
}: CalendarPageProps) {
  const [view, setView] = useState<CalendarViewMode>("month");
  const selectedEvents = useMemo(() => getEventsByDay(events, selectedDate), [events, selectedDate]);

  return (
    <section className="calendar-domain-page">
      <header className="screen-header calendar-domain-hero">
        <Badge tone="royal">Calendar Domain</Badge>
        <h1>왕실 일정표</h1>
        <p>공주의 하루를 시간순으로 정리하고 Quest, Serin, Diary, Home과 연결합니다.</p>
      </header>

      <nav className="calendar-view-tabs" aria-label="Calendar view">
        {viewTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={view === tab.key ? "active" : ""}
            onClick={() => setView(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {view === "month" && (
        <CalendarMonthView events={events} selectedDate={selectedDate} onSelectDate={onSelectDate} />
      )}
      {view === "day" && (
        <CalendarDayView
          selectedDate={selectedDate}
          events={selectedEvents}
          onComplete={onCompleteEvent}
          onCancel={onCancelEvent}
        />
      )}
      {view === "timeline" && <CalendarTimeline events={selectedEvents} />}

      <CalendarReminderPanel events={events} />
      <CalendarEventForm selectedDate={selectedDate} onCreate={onCreateEvent} />
    </section>
  );
}
