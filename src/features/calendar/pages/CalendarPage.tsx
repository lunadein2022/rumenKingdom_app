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
    () => getUpcomingEvents(events, `${today}T00:00:00`).filter((event) => event.startAt.slice(0, 10) > today).slice(0, 6),
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
        <span>✦ 왕실 일정표 <em>Calendar</em></span>
        <p>공주님의 일정과 약속을 월간 흐름으로 확인합니다.</p>
      </header>

      <div className="calendar-stage">
        <div className="calendar-mode-tabs">
          <button className="active" type="button">월간</button>
          <button type="button">주간</button>
          <button type="button">일간</button>
          <button type="button">타임라인</button>
        </div>
        <button type="button" className="gold-action" onClick={() => setShowForm((current) => !current)}>
          {showForm ? "입력 닫기" : "+ 일정 추가"}
        </button>
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

      <aside className="palace-panel calendar-left-panel">
        <h2>오늘의 일정</h2>
        <strong>{formatKoreanDateLong(today)}</strong>
        {todayEvents.length === 0 ? <p className="empty-line">오늘 등록된 일정이 없어요.</p> : null}
        {todayEvents.map((event) => (
          <p key={event.id} className="schedule-line"><time>{event.isAllDay ? "종일" : event.startAt.slice(11, 16)}</time><span>{event.title}</span></p>
        ))}
        {showForm && <CalendarEventForm selectedDate={selectedDate} onCreate={handleCreate} />}
      </aside>

      <aside className="palace-panel calendar-right-panel">
        <h2>{formatKoreanDateLong(selectedDate)}</h2>
        <CalendarDayView
          selectedDate={selectedDate}
          events={selectedEvents}
          onComplete={onCompleteEvent}
          onCancel={onCancelEvent}
          onUpdate={onUpdateEvent}
        />
        <div className="upcoming-list">
          <h3>다가오는 일정</h3>
          {upcoming.map((event) => (
            <p key={event.id}><time>{event.startAt.slice(5, 10).replace("-", ".")}</time><span>{event.title}</span></p>
          ))}
        </div>
      </aside>

      <div className="serin-helper-card compact">
        <img src="/assets/serin-bust-transparent.webp" alt="세린" />
        <div>
          <strong>세린이 도와드릴까요?</strong>
          <button type="button" onClick={() => setShowForm(true)}>오늘 일정 입력하기</button>
          <button type="button">오늘 뭐 해야 되지?</button>
        </div>
      </div>
    </section>
  );
}
