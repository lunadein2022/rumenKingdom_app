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
  onCreateEvent: (input: CalendarEventInput, linkQuest: boolean) => void;
}

// 왕실 일정표 — 좌(오늘의 일정) / 중앙(달력) / 우(선택 날짜 상세 + 다가오는 일정)
// 3단 구성입니다. 달력은 실제 캘린더처럼 요일 정렬 + 칸 안 일정 제목 칩으로
// 보여줍니다. 세린을 통한 등록이 기본이고, "+ 일정 추가"로 직접 등록도 가능합니다.
export function CalendarPage({
  events,
  selectedDate,
  onSelectDate,
  onCompleteEvent,
  onCancelEvent,
  onCreateEvent,
}: CalendarPageProps) {
  const today = getKoreanToday();
  const [visibleMonth, setVisibleMonth] = useState(selectedDate.slice(0, 7));
  const [showForm, setShowForm] = useState(false);
  const selectedEvents = useMemo(() => getEventsByDay(events, selectedDate), [events, selectedDate]);
  const todayEvents = useMemo(() => getEventsByDay(events, today), [events, today]);
  const upcoming = useMemo(
    () => getUpcomingEvents(events, `${today}T00:00:00`).filter((event) => event.startAt.slice(0, 10) > today).slice(0, 3),
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
    <section className="royal-calendar-page">
      <div className="royal-calendar-layout">
        <aside className="game-panel royal-calendar-side">
          <h1 className="game-panel-title">왕실 일정표</h1>
          <p className="royal-calendar-copy">공주의 모든 일정과 약속을 관리하세요.</p>

          <div className="royal-calendar-today">
            <h3>{formatKoreanDateLong(today)}</h3>
            <h4>
              오늘의 일정 <em>{todayEvents.length}건</em>
            </h4>
            {todayEvents.length === 0 ? (
              <p className="quest-log-empty">오늘 등록된 일정이 없습니다.</p>
            ) : (
              <ul className="royal-calendar-today-list">
                {todayEvents.map((event) => (
                  <li key={event.id}>
                    <time>{event.isAllDay ? "종일" : event.startAt.slice(11, 16)}</time>
                    <div>
                      <strong>{event.title}</strong>
                      {event.location && <small>{event.location}</small>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button type="button" className="game-panel-cta" onClick={() => setShowForm((current) => !current)}>
            {showForm ? "입력 닫기" : "＋ 일정 추가"}
          </button>

          {showForm && <CalendarEventForm selectedDate={selectedDate} onCreate={handleCreate} />}
        </aside>

        <div className="royal-calendar-center">
          <CalendarMonthView
            events={events}
            selectedDate={selectedDate}
            visibleMonth={visibleMonth}
            onSelectDate={selectDate}
            onChangeMonth={setVisibleMonth}
          />
        </div>

        <aside className="game-panel royal-calendar-side">
          <h2 className="game-panel-title">{formatKoreanDateLong(selectedDate)}</h2>
          <CalendarDayView
            selectedDate={selectedDate}
            events={selectedEvents}
            onComplete={onCompleteEvent}
            onCancel={onCancelEvent}
          />

          <div className="royal-calendar-upcoming">
            <h4>
              다가오는 일정 <em>{upcoming.length}건</em>
            </h4>
            {upcoming.length === 0 ? (
              <p className="quest-log-empty">다가오는 일정이 없습니다.</p>
            ) : (
              <ul>
                {upcoming.map((event) => (
                  <li key={event.id}>
                    <time>
                      {event.startAt.slice(5, 10).replace("-", ".")}
                      {event.isAllDay ? "" : ` ${event.startAt.slice(11, 16)}`}
                    </time>
                    <strong>{event.title}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
