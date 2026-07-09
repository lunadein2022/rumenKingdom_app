import type { CalendarEvent } from "../types/calendar.types";

interface CalendarMonthViewProps {
  events: CalendarEvent[];
  selectedDate: string;
  visibleMonth: string;
  onSelectDate: (date: string) => void;
  onChangeMonth: (month: string) => void;
}

const weekLabels = ["일", "월", "화", "수", "목", "금", "토"];
const today = new Date().toISOString().slice(0, 10);

function monthLabel(month: string) {
  const [year, rawMonth] = month.split("-");
  return `${year}년 ${Number(rawMonth)}월`;
}

function daysInMonth(month: string) {
  const [year, rawMonth] = month.split("-").map(Number);
  return new Date(year, rawMonth, 0).getDate();
}

function firstDayOffset(month: string) {
  const [year, rawMonth] = month.split("-").map(Number);
  return new Date(year, rawMonth - 1, 1).getDay();
}

function shiftMonth(month: string, delta: number) {
  const [year, rawMonth] = month.split("-").map(Number);
  const date = new Date(year, rawMonth - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toDate(month: string, day: number) {
  return `${month}-${String(day).padStart(2, "0")}`;
}

export function CalendarMonthView({ events, selectedDate, visibleMonth, onSelectDate, onChangeMonth }: CalendarMonthViewProps) {
  const eventsByDate = events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
    if (event.status !== "cancelled") {
      const date = event.startAt.slice(0, 10);
      acc[date] = [...(acc[date] ?? []), event];
    }
    return acc;
  }, {});

  return (
    <section className="calendar-card calendar-month-view">
      <div className="calendar-month-head">
        <button type="button" onClick={() => onChangeMonth(shiftMonth(visibleMonth, -1))}>이전</button>
        <strong>{monthLabel(visibleMonth)}</strong>
        <button type="button" onClick={() => onChangeMonth(shiftMonth(visibleMonth, 1))}>다음</button>
      </div>

      <div className="calendar-week-row">
        {weekLabels.map((label) => <span key={label}>{label}</span>)}
      </div>

      <div className="calendar-grid calendar-grid-readable">
        {Array.from({ length: firstDayOffset(visibleMonth) }, (_, index) => (
          <span className="calendar-empty-cell" key={`empty-${index}`} />
        ))}
        {Array.from({ length: daysInMonth(visibleMonth) }, (_, index) => index + 1).map((day) => {
          const date = toDate(visibleMonth, day);
          const dayEvents = eventsByDate[date] ?? [];
          return (
            <button
              type="button"
              key={date}
              className={[
                date === today ? "today" : "",
                date === selectedDate ? "selected" : "",
                dayEvents.length ? "has-event" : "",
              ].join(" ")}
              onClick={() => onSelectDate(date)}
            >
              <span className="calendar-day-number">{day}</span>
              <span className="calendar-day-events">
                {dayEvents.slice(0, 2).map((event) => (
                  <em key={event.id}>{event.title}</em>
                ))}
                {dayEvents.length > 2 && <em>+{dayEvents.length - 2}</em>}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
