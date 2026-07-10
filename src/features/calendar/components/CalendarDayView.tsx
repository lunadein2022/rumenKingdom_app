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
        <span>{events.length}개</span>
      </div>
      {events.length === 0 ? (
        <article className="calendar-empty">
          <strong>등록된 일정이 없습니다.</strong>
          <span>세린에게 말하거나 직접 입력해서 일정을 추가하세요.</span>
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
