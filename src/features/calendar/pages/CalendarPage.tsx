import { useMemo, useState } from "react";
import { formatKoreanDateLong, getKoreanToday } from "../../../app/dateUtils";
import type { CalendarEvent, CalendarEventInput } from "../types/calendar.types";
import { CalendarDayView } from "../components/CalendarDayView";
import { CalendarEventForm } from "../components/CalendarEventForm";
import { CalendarMonthView } from "../components/CalendarMonthView";
import { getEventsByDay, getUpcomingEvents } from "../services/calendarService";

interface CalendarPageProps {
  events: CalendarEvent[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onCompleteEvent: (id: string) => void;
  onCancelEvent: (id: string) => void;
  onUpdateEvent: (id: string, input: Partial<CalendarEventInput>) => void;
  onCreateEvent: (input: CalendarEventInput, linkQuest: boolean) => void;
}

export function CalendarPage({
  events,
  selectedDate,
  onSelectDate,
  onCompleteEvent,
  onCancelEvent,
  onUpdateEvent,
  onCreateEvent,
}: CalendarPageProps) {
  const today = getKoreanToday();
  const [visibleMonth, setVisibleMonth] = useState(selectedDate.slice(0, 7));
  const [showForm, setShowForm] = useState(false);
  const selectedEvents = useMemo(() => getEventsByDay(events, selectedDate), [events, selectedDate]);
  const todayEvents = useMemo(() => getEventsByDay(events, today), [events, today]);
  const upcoming = useMemo(
    () => getUpcomingEvents(events, `${today}T00:00:00`).filter((event) => event.startAt.slice(0, 10) > today).slice(0, 5),
    [events, today],
  );

  function selectDate(date: string) {
    onSelectDate(date);
    setVisibleMonth(date.slice(0, 7));
  }

  function handleCreate(input: CalendarEventInput, linkQuest: boolean) {
    onCreateEvent(input, linkQuest);
    setShowForm(false);
  }

  return (
    <section className="palace-scene calendar-scene scene-fullbleed">
      <div className="palace-bg" style={{ backgroundImage: 'url("/assets/palace-main.webp")' }} />
      <div className="palace-vignette" />

      <header className="scene-title calendar-title">
        <span>왕실 일정표 <em>Calendar</em></span>
        <p>월간 흐름과 선택한 날짜의 약속을 한 화면에서 확인합니다.</p>
      </header>

      <aside className="palace-panel calendar-left-panel">
        <div className="mini-list-head">
          <h2>오늘의 일정</h2>
          <button type="button" onClick={() => selectDate(today)}>오늘</button>
        </div>
        <strong>{formatKoreanDateLong(today)}</strong>
        {todayEvents.length === 0 ? <p className="empty-line">오늘의 왕실 일정은 아직 비어 있습니다.</p> : null}
        {todayEvents.slice(0, 4).map((event) => (
          <p key={event.id} className="schedule-line">
            <time>{event.isAllDay ? "종일" : event.startAt.slice(11, 16)}</time>
            <span>{event.title}</span>
          </p>
        ))}
        <button type="button" className="gold-action calendar-create-toggle" onClick={() => setShowForm((current) => !current)}>
          {showForm ? "입력 닫기" : "직접 일정 입력"}
        </button>
        {showForm && <CalendarEventForm selectedDate={selectedDate} onCreate={handleCreate} />}
      </aside>

      <div className="calendar-stage">
        <div className="calendar-mode-tabs">
          <button className="active" type="button">월간</button>
          <button type="button">주간</button>
          <button type="button">일간</button>
          <button type="button">타임라인</button>
        </div>
        <div className="calendar-board palace-panel flat-panel">
          <CalendarMonthView
            events={events}
            selectedDate={selectedDate}
            visibleMonth={visibleMonth}
            onSelectDate={selectDate}
            onChangeMonth={setVisibleMonth}
          />
        </div>
      </div>

      <aside className="palace-panel calendar-right-panel">
        <CalendarDayView
          selectedDate={selectedDate}
          events={selectedEvents}
          onComplete={onCompleteEvent}
          onCancel={onCancelEvent}
          onUpdate={onUpdateEvent}
        />
        <div className="upcoming-list">
          <h3>다가오는 왕실 일정</h3>
          {upcoming.length === 0 && <p className="empty-line">예정된 다음 일정이 없습니다.</p>}
          {upcoming.map((event) => (
            <p key={event.id}><time>{event.startAt.slice(5, 10).replace("-", ".")}</time><span>{event.title}</span></p>
          ))}
        </div>
      </aside>
    </section>
  );
}
