import { FormEvent, useMemo, useState } from "react";
import { Badge } from "../../../components/design-system/Badge";
import { Button } from "../../../components/design-system/Button";
import type { CalendarEvent } from "../types/calendar.types";
import { CalendarDayView } from "../components/CalendarDayView";
import { CalendarMonthView } from "../components/CalendarMonthView";
import { getEventsByDay } from "../services/calendarService";

interface CalendarPageProps {
  events: CalendarEvent[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onAskSerin: (message: string) => void;
  onCompleteEvent: (id: string) => void;
  onCancelEvent: (id: string) => void;
}

export function CalendarPage({
  events,
  selectedDate,
  onSelectDate,
  onAskSerin,
  onCompleteEvent,
  onCancelEvent,
}: CalendarPageProps) {
  const [visibleMonth, setVisibleMonth] = useState(selectedDate.slice(0, 7));
  const [serinRequest, setSerinRequest] = useState("");
  const selectedEvents = useMemo(() => getEventsByDay(events, selectedDate), [events, selectedDate]);

  function selectDate(date: string) {
    onSelectDate(date);
    setVisibleMonth(date.slice(0, 7));
  }

  function submitSerinRequest(event: FormEvent) {
    event.preventDefault();
    const message = serinRequest.trim();
    if (!message) return;
    onAskSerin(message);
    setSerinRequest("");
  }

  return (
    <section className="calendar-domain-page calendar-workspace">
      <header className="screen-header calendar-domain-hero">
        <Badge tone="royal">Calendar</Badge>
        <h1>일정</h1>
        <p>세린에게 말하면 일정이 준비됩니다. 선택한 날짜의 일정은 오른쪽에서 바로 확인하세요.</p>
      </header>

      <CalendarMonthView
        events={events}
        selectedDate={selectedDate}
        visibleMonth={visibleMonth}
        onSelectDate={selectDate}
        onChangeMonth={setVisibleMonth}
      />

      <div className="calendar-side-stack">
        <CalendarDayView selectedDate={selectedDate} events={selectedEvents} onComplete={onCompleteEvent} onCancel={onCancelEvent} />
        <form className="calendar-serin-form" onSubmit={submitSerinRequest}>
          <strong>세린에게 일정 말하기</strong>
          <textarea
            value={serinRequest}
            onChange={(event) => setSerinRequest(event.target.value)}
            placeholder="예: 내일 오후 3시 조달청 전화 일정 잡아줘"
          />
          <Button size="sm" type="submit">세린에게 전달</Button>
        </form>
      </div>
    </section>
  );
}
