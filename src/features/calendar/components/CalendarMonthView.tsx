import type { CalendarEvent } from "../types/calendar.types";
import { isDateWithinEvent, isMultiDayEvent } from "../services/calendarService";

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

// "8월 19일부터 3일간" 같은 기간 일정은 시작일 하루에만 점을 찍지 않고, 걸쳐
// 있는 모든 날짜에 표시되어야 합니다. eventCounts는 "이 날짜에 걸쳐 있는 일정
// 개수"를, multiDaySpans는 "이 날짜가 여러 날 일정의 시작/중간/끝 중 어디인지"를
// 담아 CSS에서 점 대신 이어지는 바(bar) 형태로 그릴 수 있게 합니다.
function buildDayIndex(events: CalendarEvent[], visibleMonth: string) {
  const monthStart = `${visibleMonth}-01`;
  const monthEnd = `${visibleMonth}-${String(daysInMonth(visibleMonth)).padStart(2, "0")}`;
  const eventCounts: Record<string, number> = {};
  const multiDaySpans: Record<string, "start" | "middle" | "end" | "single"> = {};

  for (const event of events) {
    if (event.status === "cancelled") continue;
    if (!isMultiDayEvent(event)) {
      const date = event.startAt.slice(0, 10);
      if (date >= monthStart && date <= monthEnd) {
        eventCounts[date] = (eventCounts[date] ?? 0) + 1;
      }
      continue;
    }
    const startDate = event.startAt.slice(0, 10);
    const endDate = event.endAt!.slice(0, 10);
    for (let day = 1; day <= daysInMonth(visibleMonth); day += 1) {
      const date = toDate(visibleMonth, day);
      if (!isDateWithinEvent(event, date)) continue;
      eventCounts[date] = (eventCounts[date] ?? 0) + 1;
      if (date === startDate && date === endDate) multiDaySpans[date] = "single";
      else if (date === startDate) multiDaySpans[date] = "start";
      else if (date === endDate) multiDaySpans[date] = "end";
      else multiDaySpans[date] = "middle";
    }
  }

  return { eventCounts, multiDaySpans };
}

export function CalendarMonthView({ events, selectedDate, visibleMonth, onSelectDate, onChangeMonth }: CalendarMonthViewProps) {
  const { eventCounts, multiDaySpans } = buildDayIndex(events, visibleMonth);

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
          const span = multiDaySpans[date];
          return (
            <button
              type="button"
              key={date}
              className={[
                date === today ? "today" : "",
                date === selectedDate ? "selected" : "",
                eventCounts[date] ? "has-event" : "",
                span && span !== "single" ? `multi-day multi-day-${span}` : "",
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
