import { useMemo, useState } from "react";
import { Badge } from "../../../components/design-system/Badge";
import { Button } from "../../../components/design-system/Button";
import type { CalendarEvent, CalendarEventInput } from "../types/calendar.types";
import { CalendarDayView } from "../components/CalendarDayView";
import { CalendarEventForm } from "../components/CalendarEventForm";
import { CalendarMonthView } from "../components/CalendarMonthView";
import { CalendarReminderPanel } from "../components/CalendarReminderPanel";
import { getEventsByDay } from "../services/calendarService";

interface CalendarPageProps {
  events: CalendarEvent[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onCompleteEvent: (id: string) => void;
  onCancelEvent: (id: string) => void;
  onCreateEvent: (input: CalendarEventInput, linkQuest: boolean) => void;
}

// 세린을 통한 일정 등록은 보조 경로이고, "+ 일정 추가" 버튼으로 직접 등록도 가능합니다.
export function CalendarPage({
  events,
  selectedDate,
  onSelectDate,
  onCompleteEvent,
  onCancelEvent,
  onCreateEvent,
}: CalendarPageProps) {
  const [visibleMonth, setVisibleMonth] = useState(selectedDate.slice(0, 7));
  const [showForm, setShowForm] = useState(false);
  const selectedEvents = useMemo(() => getEventsByDay(events, selectedDate), [events, selectedDate]);

  function selectDate(date: string) {
    onSelectDate(date);
    setVisibleMonth(date.slice(0, 7));
  }

  function handleCreate(input: CalendarEventInput, linkQuest: boolean) {
    onCreateEvent(input, linkQuest);
    setShowForm(false);
  }

  return (
    <section className="calendar-domain-page">
      <header className="screen-header calendar-domain-hero">
        <Badge tone="royal">Calendar Domain</Badge>
        <h1>왕실 일정표</h1>
        <p>날짜를 선택하면 그날의 일정이 바로 아래 보입니다. 세린에게 말해서 등록할 수도, 직접 추가할 수도 있습니다.</p>
        <Button variant="glass" onClick={() => setShowForm((current) => !current)}>
          {showForm ? "닫기" : "+ 일정 추가"}
        </Button>
      </header>

      {showForm && <CalendarEventForm selectedDate={selectedDate} onCreate={handleCreate} />}

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
