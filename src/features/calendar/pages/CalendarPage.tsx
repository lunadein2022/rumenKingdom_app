import { type FormEvent, useMemo, useState } from "react";
import { Badge } from "../../../components/design-system/Badge";
import { Button } from "../../../components/design-system/Button";
import { ProgressBar } from "../../../components/design-system/ProgressBar";
import type { Quest } from "../../../app/types";
import type { CalendarEvent } from "../types/calendar.types";
import { CalendarDayView } from "../components/CalendarDayView";
import { CalendarMonthView } from "../components/CalendarMonthView";
import { getEventsByDay } from "../services/calendarService";

interface CalendarPageProps {
  events: CalendarEvent[];
  quests: Quest[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onAskSerin: (message: string) => void;
  onCompleteEvent: (id: string) => void;
  onCancelEvent: (id: string) => void;
}

export function CalendarPage({
  events,
  quests,
  selectedDate,
  onSelectDate,
  onAskSerin,
  onCompleteEvent,
  onCancelEvent,
}: CalendarPageProps) {
  const [visibleMonth, setVisibleMonth] = useState(selectedDate.slice(0, 7));
  const [serinRequest, setSerinRequest] = useState("");
  const selectedEvents = useMemo(() => getEventsByDay(events, selectedDate), [events, selectedDate]);
  const mainQuests = useMemo(
    () => quests.filter((quest) => quest.type === "main" && quest.status !== "completed").slice(0, 3),
    [quests],
  );

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
    <section className="calendar-domain-page calendar-workspace office-workspace">
      <header className="screen-header calendar-domain-hero">
        <Badge tone="royal">Office</Badge>
        <h1>집무실</h1>
        <p>일정, 회의, 프로젝트, 메인 Quest를 한 곳에서 확인합니다. 새 등록은 세린에게 말하면 바로 준비됩니다.</p>
      </header>

      <CalendarMonthView
        events={events}
        selectedDate={selectedDate}
        visibleMonth={visibleMonth}
        onSelectDate={selectDate}
        onChangeMonth={setVisibleMonth}
      />

      <div className="calendar-side-stack">
        <section className="office-main-quests">
          <div className="calendar-section-title">
            <h2>메인 Quest</h2>
            <span>{mainQuests.length}개 진행</span>
          </div>
          {mainQuests.length === 0 ? (
            <article className="calendar-empty">
              <strong>진행 중인 메인 Quest가 없습니다.</strong>
              <span>새 프로젝트는 세린과 대화하며 정리하세요.</span>
            </article>
          ) : (
            mainQuests.map((quest) => (
              <article key={quest.id} className="office-project-row">
                <div>
                  <strong>{quest.title}</strong>
                  <span>{quest.chapter ?? quest.description}</span>
                </div>
                <ProgressBar value={quest.progress} label={`${quest.title} progress`} />
              </article>
            ))
          )}
        </section>

        <CalendarDayView selectedDate={selectedDate} events={selectedEvents} onComplete={onCompleteEvent} onCancel={onCancelEvent} />

        <form className="calendar-serin-form" onSubmit={submitSerinRequest}>
          <strong>세린에게 업무 말하기</strong>
          <textarea
            value={serinRequest}
            onChange={(event) => setSerinRequest(event.target.value)}
            placeholder="예: 내일 오후 3시에 조달청 전화 일정 넣어줘"
          />
          <Button size="sm" type="submit">세린에게 전달</Button>
        </form>
      </div>
    </section>
  );
}
