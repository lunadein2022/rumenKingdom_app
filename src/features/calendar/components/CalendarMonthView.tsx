import type { CalendarEvent } from "../types/calendar.types";
import { getKoreanToday } from "../../../app/dateUtils";
import { isDateWithinEvent, isMultiDayEvent } from "../services/calendarService";

interface CalendarMonthViewProps {
  events: CalendarEvent[];
  selectedDate: string;
  visibleMonth: string;
  onSelectDate: (date: string) => void;
  onChangeMonth: (month: string) => void;
}

const weekLabels = ["일", "월", "화", "수", "목", "금", "토"];
const today = getKoreanToday();

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

function buildDayEvents(events: CalendarEvent[], visibleMonth: string) {
  const byDate: Record<string, CalendarEvent[]> = {};
  for (let day = 1; day <= daysInMonth(visibleMonth); day += 1) {
    const date = toDate(visibleMonth, day);
    const list = events
      .filter((event) => event.status !== "cancelled" && isDateWithinEvent(event, date))
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
    if (list.length > 0) byDate[date] = list;
  }
  return byDate;
}

function buildMultiDaySpans(events: CalendarEvent[], visibleMonth: string) {
  const spans: Record<string, "start" | "middle" | "end" | "single"> = {};
  for (const event of events) {
    if (event.status === "cancelled" || !isMultiDayEvent(event)) continue;
    const startDate = event.startAt.slice(0, 10);
    const endDate = event.endAt!.slice(0, 10);
    for (let day = 1; day <= daysInMonth(visibleMonth); day += 1) {
      const date = toDate(visibleMonth, day);
      if (!isDateWithinEvent(event, date)) continue;
      if (date === startDate && date === endDate) spans[date] = "single";
      else if (date === startDate) spans[date] = "start";
      else if (date === endDate) spans[date] = "end";
      else spans[date] = "middle";
    }
  }
  return spans;
}

export function CalendarMonthView({ events, selectedDate, visibleMonth, onSelectDate, onChangeMonth }: CalendarMonthViewProps) {
  const dayEvents = buildDayEvents(events, visibleMonth);
  const multiDaySpans = buildMultiDaySpans(events, visibleMonth);

  return (
    <section className="calendar-card calendar-month-view">
      <div className="calendar-month-head">
        <button type="button" onClick={() => onChangeMonth(shiftMonth(visibleMonth, -1))} aria-label="이전 달">‹</button>
        <strong>{monthLabel(visibleMonth)}</strong>
        <button type="button" onClick={() => onChangeMonth(shiftMonth(visibleMonth, 1))} aria-label="다음 달">›</button>
      </div>
      <div className="calendar-week-row">
        {weekLabels.map((label, index) => (
          <span key={label} className={index === 0 ? "sunday" : index === 6 ? "saturday" : ""}>{label}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {Array.from({ length: new Date(`${visibleMonth}-01T00:00:00`).getDay() }, (_, index) => (
          <span key={`empty-${index}`} className="calendar-empty-cell" aria-hidden="true" />
        ))}
        {Array.from({ length: daysInMonth(visibleMonth) }, (_, index) => index + 1).map((day) => {
          const date = toDate(visibleMonth, day);
          const list = dayEvents[date] ?? [];
          const weekday = new Date(`${date}T00:00:00`).getDay();
          const span = multiDaySpans[date];
          return (
            <button
              type="button"
              key={date}
              className={[
                date === today ? "today" : "",
                date === selectedDate ? "selected" : "",
                list.length > 0 ? "has-event" : "",
                weekday === 0 ? "sunday" : weekday === 6 ? "saturday" : "",
                span && span !== "single" ? `multi-day multi-day-${span}` : "",
              ].join(" ")}
              onClick={() => onSelectDate(date)}
            >
              <span>{day}</span>
              {list.slice(0, 2).map((event) => (
                <em key={event.id} className="calendar-event-chip">
                  {event.isAllDay ? event.title : `${event.startAt.slice(11, 16)} ${event.title}`}
                </em>
              ))}
              {list.length > 2 && <small>+{list.length - 2}</small>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
