import type { AppMockData, ViewKey } from "../../app/types";
import { getEventsByDay, getUpcomingEvents } from "../../features/calendar/services/calendarService";

interface HomeSceneProps {
  data: AppMockData;
  activeView: ViewKey;
  onNavigate: (view: ViewKey) => void;
}

const palaceRooms: Array<{ label: string; shortLabel: string; icon: string; view: ViewKey; angle: string }> = [
  { label: "왕궁 지도", shortLabel: "왕궁", icon: "♕", view: "castle", angle: "room-top" },
  { label: "왕좌의 방", shortLabel: "성장", icon: "♛", view: "progress", angle: "room-left" },
  { label: "집무실", shortLabel: "업무", icon: "✎", view: "calendar", angle: "room-right" },
  { label: "왕국도서관", shortLabel: "기록", icon: "▤", view: "library", angle: "room-bottom-left" },
  { label: "왕궁정원", shortLabel: "힐링", icon: "✦", view: "garden", angle: "room-bottom-right" },
  { label: "공주의 침실", shortLabel: "회고", icon: "◐", view: "bedroom", angle: "room-bottom" },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "좋은 아침입니다, 공주님.";
  if (hour < 18) return "오늘 일정이 차분히 진행되고 있습니다, 공주님.";
  return "오늘 하루도 정말 수고하셨습니다, 공주님.";
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function HomeScene({ data, onNavigate }: HomeSceneProps) {
  const today = todayKey();
  const todayEvents = getEventsByDay(data.events, today);
  const todayQuests = data.quests.filter((quest) => quest.dueDate === today && quest.status !== "completed");
  const activeMainQuests = data.quests.filter((quest) => quest.type === "main" && quest.status !== "completed");
  const nextEvent = getUpcomingEvents(data.events)[0];

  return (
    <section className="palace-os-home" aria-label="루멘 왕성 로비">
      <div className="palace-os-scene">
        <div className="palace-scene-vignette" />

        <header className="palace-hud-top">
          <div className="palace-brand-lockup">
            <span className="royal-emblem">♕</span>
            <div>
              <strong>PRINCESS OS</strong>
              <span>루멘 왕성 · Live Palace</span>
            </div>
          </div>
          <div className="palace-level-chip">
            <span>Lv.{data.progress.level} Princess</span>
            <meter min={0} max={data.progress.requiredExp} value={data.progress.currentExp} />
            <strong>{data.progress.expRate}%</strong>
          </div>
          <div className="palace-resource-row" aria-label="오늘 상태">
            <span>일정 {todayEvents.length}</span>
            <span>Quest {todayQuests.length}</span>
            <span>프로젝트 {activeMainQuests.length}</span>
          </div>
        </header>

        <aside className="palace-hud-left" aria-label="오늘 브리핑">
          <section className="hud-panel briefing">
            <span className="hud-kicker">오늘 브리핑</span>
            <h1>{greeting()}</h1>
            <p>{nextEvent ? `다음 일정은 ${nextEvent.startAt.slice(11, 16)} · ${nextEvent.title}입니다.` : "오늘은 여유롭게 왕궁을 정리할 수 있는 하루입니다."}</p>
            <div className="briefing-metrics">
              <button type="button" onClick={() => onNavigate("calendar")}>
                <span>일정</span>
                <strong>{todayEvents.length}건</strong>
              </button>
              <button type="button" onClick={() => onNavigate("quests")}>
                <span>Quest</span>
                <strong>{todayQuests.length}개</strong>
              </button>
              <button type="button" onClick={() => onNavigate("calendar")}>
                <span>메인 Quest</span>
                <strong>{activeMainQuests.length}개</strong>
              </button>
            </div>
          </section>
        </aside>

        <div className="palace-character-stage" aria-hidden="true">
          <img className="palace-princess" src="/assets/princess-full-transparent.png" alt="" />
          <img className="palace-serin" src="/assets/serin-full-transparent.png" alt="" />
        </div>

        <div className="palace-serin-bubble">
          <strong>세린</strong>
          <p>
            공주님, 오늘은 어디로 가실까요?
            <br />
            왕궁 지도에서 공간을 고르시면 제가 안내하겠습니다.
          </p>
        </div>

        <aside className="palace-hud-right" aria-label="왕궁 지도">
          <section className="hud-panel palace-map-panel">
            <div className="hud-panel-title">
              <strong>왕궁 지도</strong>
              <span>Scene Navigator</span>
            </div>
            <div className="royal-mini-map">
              <button type="button" className="map-center active" onClick={() => onNavigate("home")}>
                <span>♕</span>
                <strong>로비</strong>
              </button>
              {palaceRooms.slice(1).map((room) => (
                <button
                  key={room.label}
                  type="button"
                  className={`map-node ${room.angle}`}
                  onClick={() => onNavigate(room.view)}
                >
                  <span>{room.icon}</span>
                  <strong>{room.shortLabel}</strong>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <nav className="palace-bottom-dock" aria-label="왕궁 장소 이동">
          {palaceRooms.map((room) => (
            <button key={room.label} type="button" onClick={() => onNavigate(room.view)}>
              <span>{room.icon}</span>
              <strong>{room.label}</strong>
            </button>
          ))}
        </nav>
      </div>
    </section>
  );
}
