import type { AppMockData, ViewKey } from "../../app/types";
import { getEventsByDay, getUpcomingEvents } from "../../features/calendar/services/calendarService";

interface HomeSceneProps {
  data: AppMockData;
  activeView: ViewKey;
  onNavigate: (view: ViewKey) => void;
}

const roomChoices: Array<{ label: string; icon: string; view: ViewKey }> = [
  { label: "왕좌의 방", icon: "♛", view: "progress" },
  { label: "왕국도서관", icon: "▤", view: "library" },
  { label: "집무실", icon: "✎", view: "quests" },
  { label: "왕궁정원", icon: "✧", view: "garden" },
  { label: "공주의 침실", icon: "☾", view: "calendar" },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "좋은 아침입니다, 공주님.";
  if (hour < 18) return "오늘 일정이 차분히 진행되고 있습니다, 공주님.";
  return "오늘 하루도 정말 수고하셨습니다, 공주님.";
}

export function HomeScene({ data, onNavigate }: HomeSceneProps) {
  const todayEvents = getEventsByDay(data.events, "2026-07-09");
  const todayQuests = data.quests.filter((quest) => quest.dueDate === "2026-07-09" && quest.status !== "completed");
  const nextEvent = getUpcomingEvents(data.events)[0];

  return (
    <section className="palace-lobby-page">
      <div className="palace-lobby-scene">
        <div className="lobby-atmosphere" />
        <div className="lobby-opening-copy">
          <span>루멘 왕성 · 로비</span>
          <h1>공주님의 하루가 왕궁에서 시작됩니다.</h1>
        </div>

        <div className="lobby-character-stage">
          <img className="lobby-princess-main" src="/assets/princess-full-transparent.png" alt="공주" />
          <img className="lobby-serin-aide" src="/assets/serin-full-transparent.png" alt="세린" />
        </div>

        <div className="serin-speech-bubble">
          <strong>세린</strong>
          <p>{greeting()}<br />오늘은 어디로 가실까요?</p>
        </div>

        <nav className="palace-room-pills" aria-label="왕궁 장소 선택">
          {roomChoices.map((room) => (
            <button key={room.view} type="button" onClick={() => onNavigate(room.view)}>
              <span>{room.icon}</span>
              <strong>{room.label}</strong>
            </button>
          ))}
        </nav>
      </div>

      <aside className="lobby-today-panel">
        <section>
          <h2>오늘 브리핑</h2>
          <p>{nextEvent ? `${nextEvent.startAt.slice(11, 16)} · ${nextEvent.title}` : "세린과 함께 오늘의 방향을 정하면 좋겠습니다."}</p>
        </section>
        <div className="lobby-summary-grid">
          <article><strong>{todayEvents.length}</strong><span>오늘 일정</span></article>
          <article><strong>{todayQuests.length}</strong><span>진행 Quest</span></article>
          <article><strong>Lv.{data.progress.level}</strong><span>공주 레벨</span></article>
        </div>
        <button type="button" onClick={() => onNavigate("serin")}>세린에게 말하기</button>
      </aside>
    </section>
  );
}
