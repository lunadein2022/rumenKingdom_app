import { useMemo, useState } from "react";
import { Badge } from "../../../components/design-system/Badge";
import type { CalendarEvent } from "../types/calendar.types";
import { CalendarDayView } from "../components/CalendarDayView";
import { CalendarMonthView } from "../components/CalendarMonthView";
import { CalendarReminderPanel } from "../components/CalendarReminderPanel";
import { getEventsByDay } from "../services/calendarService";

interface CalendarPageProps {
  events: CalendarEvent[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onCompleteEvent: (id: string) => void;
  onCancelEvent: (id: string) => void;
}

// 일정 등록은 세린과의 대화를 통해서만 이루어집니다. (수동 등록 폼 없음)
export function CalendarPage({
  events,
  selectedDate,
  onSelectDate,
  onCompleteEvent,
  onCancelEvent,
}: CalendarPageProps) {
  const [visibleMonth, setVisibleMonth] = useState(selectedDate.slice(0, 7));
  const selectedEvents = useMemo(() => getEventsByDay(events, selectedDate), [events, selectedDate]);

  function selectDate(date: string) {
    onSelectDate(date);
    setVisibleMonth(date.slice(0, 7));
  }

  return (
    <section className="calendar-domain-page">
      <header className="screen-header calendar-domain-hero">
        <Badge tone="royal">Calendar Domain</Badge>
        <h1>왕실 일정표</h1>
        <p>날짜를 선택하면 그날의 일정이 바로 아래 보입니다. 일정 등록은 세린에게 말해주세요.</p>
      </header>

      <div className="calendar-main-grid">
        <CalendarMonthView
          events={events}
          selectedDate={selectedDate}
          visibleMonth={visibleMonth}
          onSelectDate={selectDate}
          onChangeMonth={setVisibleMonth}
        />
        <CalendarDayView selectedDate={selectedDate} events={selectedEvents} onComplete={onCompleteEvent} onCancel={onCancelEvent} />
      </div>

      <CalendarReminderPanel events={events} />
    </section>
  );
}
