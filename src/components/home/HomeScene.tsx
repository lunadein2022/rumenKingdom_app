import type { AppMockData, ViewKey } from "../../app/types";
import { getEventsByDay, getUpcomingEvents } from "../../features/calendar/services/calendarService";
import { Button } from "../design-system/Button";

interface HomeSceneProps {
  data: AppMockData;
  activeView: ViewKey;
  onNavigate: (view: ViewKey) => void;
}

export function HomeScene({ data, onNavigate }: HomeSceneProps) {
  const todayEvents = getEventsByDay(data.events, "2026-07-09");
  const todayQuests = data.quests.filter((quest) => quest.dueDate === "2026-07-09" && quest.status !== "completed");
  const nextEvent = getUpcomingEvents(data.events)[0];
  const briefing = nextEvent
    ? `${nextEvent.startAt.slice(11, 16)} ${nextEvent.title} 일정이 있습니다.`
    : "오늘은 세린과 함께 조용히 하루를 정리하면 좋겠습니다.";

  return (
    <section className="lobby-page">
      <div className="lobby-scene">
        <div className="lobby-copy">
          <span>루멘 왕성 · 로비</span>
          <h1>공주님, 오늘의 왕궁이 열렸습니다.</h1>
          <p>{briefing}</p>
        </div>

        <div className="lobby-characters">
          <img className="lobby-princess" src="/assets/princess-full-transparent.png" alt="공주 전신" />
          <img className="lobby-serin" src="/assets/serin-full-transparent.png" alt="세린 전신" />
        </div>
      </div>

      <section className="lobby-briefing">
        <article>
          <strong>{todayEvents.length}</strong>
          <span>오늘 일정</span>
        </article>
        <article>
          <strong>{todayQuests.length}</strong>
          <span>진행 Quest</span>
        </article>
        <article>
          <strong>Lv.{data.progress.level}</strong>
          <span>공주 성장</span>
        </article>
      </section>

      <section className="lobby-actions">
        <Button onClick={() => onNavigate("castle")}>왕성 이동</Button>
        <Button variant="glass" onClick={() => onNavigate("serin")}>세린 호출</Button>
      </section>
    </section>
  );
}
