import { CalendarEventCard } from "./CalendarEventCard";
import type { CalendarEvent, CalendarEventInput } from "../types/calendar.types";

interface CalendarDayViewProps {
  selectedDate: string;
  events: CalendarEvent[];
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  onUpdate: (id: string, input: Partial<CalendarEventInput>) => void;
}

export function CalendarDayView({ selectedDate, events, onComplete, onCancel, onUpdate }: CalendarDayViewProps) {
  return (
    <section className="calendar-day-view">
      <div className="calendar-section-title">
        <h2>{selectedDate} 일정</h2>
        <span>{events.length}건</span>
      </div>
      {events.length === 0 ? (
        <article className="calendar-empty">
          <strong>이 날의 왕실 일정은 비어 있습니다.</strong>
          <span>일정은 직접 입력하거나 세린에게 말해서 등록할 수 있습니다.</span>
        </article>
      ) : (
        events.map((event) => (
          <CalendarEventCard
            key={event.id}
            event={event}
            onComplete={onComplete}
            onCancel={onCancel}
            onUpdate={onUpdate}
          />
        ))
      )}
    </section>
  );
}
