import type { CalendarEvent } from "../types/calendar.types";

interface CalendarMonthViewProps {
  events: CalendarEvent[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

const weekLabels = ["일", "월", "화", "수", "목", "금", "토"];
const today = "2026-07-09";

function toDate(day: number) {
  return `2026-07-${String(day).padStart(2, "0")}`;
}

export function CalendarMonthView({ events, selectedDate, onSelectDate }: CalendarMonthViewProps) {
  const eventCounts = events.reduce<Record<string, number>>((acc, event) => {
    if (event.status !== "cancelled") {
      const date = event.startAt.slice(0, 10);
      acc[date] = (acc[date] ?? 0) + 1;
    }
    return acc;
  }, {});

  return (
    <section className="calendar-card calendar-month-view">
      <div className="calendar-month-head">
        <strong>2026년 7월</strong>
        <span>루멘 왕실 일정표</span>
      </div>
      <div className="calendar-week-row">
        {weekLabels.map((label) => <span key={label}>{label}</span>)}
      </div>
      <div className="calendar-grid">
        {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => {
          const date = toDate(day);
          return (
            <button
              type="button"
              key={date}
              className={[
                date === today ? "today" : "",
                date === selectedDate ? "selected" : "",
                eventCounts[date] ? "has-event" : "",
              ].join(" ")}
              onClick={() => onSelectDate(date)}
            >
              <span>{day}</span>
              {eventCounts[date] ? <small>{eventCounts[date]}</small> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
