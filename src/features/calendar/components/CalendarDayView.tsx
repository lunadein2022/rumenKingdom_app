import { CalendarEventCard } from "./CalendarEventCard";
import type { CalendarEvent } from "../types/calendar.types";

interface CalendarDayViewProps {
  selectedDate: string;
  events: CalendarEvent[];
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
}

export function CalendarDayView({ selectedDate, events, onComplete, onCancel }: CalendarDayViewProps) {
  return (
    <section className="calendar-day-view">
      <div className="calendar-section-title">
        <h2>{selectedDate}</h2>
        <span>{events.length}개 일정</span>
      </div>
      {events.length === 0 ? (
        <article className="calendar-empty">
          <strong>등록된 일정이 없습니다.</strong>
          <span>새 일정은 세린에게 말하면 바로 준비됩니다.</span>
        </article>
      ) : (
        events.map((event) => (
          <CalendarEventCard
            key={event.id}
            event={event}
            onComplete={onComplete}
            onCancel={onCancel}
          />
        ))
      )}
    </section>
  );
}
