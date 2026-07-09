import type { CalendarEvent } from "../types/calendar.types";

interface CalendarReminderPanelProps {
  events: CalendarEvent[];
}

export function CalendarReminderPanel({ events }: CalendarReminderPanelProps) {
  const upcoming = events.filter((event) => event.status === "scheduled").slice(0, 3);

  return (
    <section className="calendar-reminder-panel">
      <div className="calendar-section-title">
        <h2>다가오는 알림</h2>
        <span>Reminder</span>
      </div>
      {upcoming.length === 0 ? (
        <p>오늘 더 이상 예정된 알림이 없습니다.</p>
      ) : (
        upcoming.map((event) => (
          <article key={event.id}>
            <strong>{event.title}</strong>
            <span>{event.reminderMinutes ? `${event.reminderMinutes}분 전` : "알림 없음"}</span>
          </article>
        ))
      )}
    </section>
  );
}
