import type { CalendarEvent } from "../types/calendar.types";

interface CalendarTimelineProps {
  events: CalendarEvent[];
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export function CalendarTimeline({ events }: CalendarTimelineProps) {
  return (
    <section className="calendar-timeline">
      <div className="calendar-section-title">
        <h2>시간순 흐름</h2>
        <span>Timeline</span>
      </div>
      {events.map((event) => (
        <article key={event.id} className={`timeline-item ${event.status}`}>
          <time>{event.isAllDay ? "종일" : formatTime(event.startAt)}</time>
          <div>
            <strong>{event.title}</strong>
            <span>{event.location || "루멘 왕성"}</span>
          </div>
        </article>
      ))}
    </section>
  );
}
