import type { CalendarEvent } from "../../app/types";
import { Badge } from "../design-system/Badge";

interface CalendarScreenProps {
  events: CalendarEvent[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

const monthDays = Array.from({ length: 31 }, (_, index) => index + 1);
const weekLabels = ["일", "월", "화", "수", "목", "금", "토"];
const today = "2026-07-09";

function toDate(day: number) {
  return `2026-07-${String(day).padStart(2, "0")}`;
}

export function CalendarScreen({ events, selectedDate, onSelectDate }: CalendarScreenProps) {
  const selectedEvents = events.filter((event) => event.eventDate === selectedDate);
  const eventDates = new Set(events.map((event) => event.eventDate));

  return (
    <section className="screen-stack">
      <header className="screen-header">
        <Badge tone="royal">Calendar</Badge>
        <h1>왕실 캘린더</h1>
        <p>날짜를 선택하면 해당 일정이 아래에 정리됩니다.</p>
      </header>

      <section className="calendar-card">
        <div className="calendar-month-head">
          <strong>2026년 7월</strong>
          <Badge tone="gold">오늘 9일</Badge>
        </div>
        <div className="calendar-week-row">
          {weekLabels.map((label) => <span key={label}>{label}</span>)}
        </div>
        <div className="calendar-grid">
          {monthDays.map((day) => {
            const date = toDate(day);
            return (
              <button
                type="button"
                key={date}
                className={[
                  date === today ? "today" : "",
                  date === selectedDate ? "selected" : "",
                  eventDates.has(date) ? "has-event" : "",
                ].join(" ")}
                onClick={() => onSelectDate(date)}
              >
                <span>{day}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="day-agenda">
        <h2>{selectedDate} 일정</h2>
        {selectedEvents.length === 0 ? (
          <p>등록된 일정이 없습니다.</p>
        ) : (
          selectedEvents.map((event) => (
            <article key={event.id}>
              <Badge tone="soft">{event.roomKey}</Badge>
              <div>
                <strong>{event.time}</strong>
                <span>{event.title}</span>
              </div>
            </article>
          ))
        )}
      </section>
    </section>
  );
}
