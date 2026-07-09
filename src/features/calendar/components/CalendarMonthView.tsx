import type { CalendarEvent } from "../types/calendar.types";

interface CalendarMonthViewProps {
  events: CalendarEvent[];
  selectedDate: string;
  visibleMonth: string;
  onSelectDate: (date: string) => void;
  onChangeMonth: (month: string) => void;
}

const weekLabels = ["일", "월", "화", "수", "목", "금", "토"];
const today = "2026-07-09";

function monthLabel(month: string) {
  const [year, rawMonth] = month.split("-");
  return `${year}년 ${Number(rawMonth)}월`;
}

function daysInMonth(month: string) {
  const [year, rawMonth] = month.split("-").map(Number);
  return new Date(year, rawMonth, 0).getDate();
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
        <button type="button" onClick={() => onChangeMonth(shiftMonth(visibleMonth, -1))}>‹</button>
        <strong>{monthLabel(visibleMonth)}</strong>
        <button type="button" onClick={() => onChangeMonth(shiftMonth(visibleMonth, 1))}>›</button>
      </div>
      <span className="calendar-range-note">과거, 현재, 미래 일정을 모두 탐색할 수 있습니다.</span>
      <div className="calendar-week-row">
        {weekLabels.map((label) => <span key={label}>{label}</span>)}
      </div>
      <div className="calendar-grid">
        {Array.from({ length: daysInMonth(visibleMonth) }, (_, index) => index + 1).map((day) => {
          const date = toDate(visibleMonth, day);
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
