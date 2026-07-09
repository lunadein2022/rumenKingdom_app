import { useEffect, useState } from "react";
import type { AppMockData, ViewKey } from "../../app/types";
import type { CastleRoom, CastleRoomKey } from "../../features/castle/types/castle.types";
import { getEventsByDay, getUpcomingEvents } from "../../features/calendar/services/calendarService";
import { QuestTrackerHud } from "./QuestTrackerHud";

interface HomeSceneProps {
  data: AppMockData;
  activeView: ViewKey;
  onNavigate: (view: ViewKey) => void;
  onVisitRoom: (key: CastleRoomKey) => void;
  onCompleteQuest: (id: string) => void;
}

const TODAY = "2026-07-09";

const roomIcons: Record<CastleRoomKey, string> = {
  lobby: "🏰",
  throne: "👑",
  library: "📚",
  office: "🖋",
  garden: "🌸",
  bedroom: "🛏",
  tower: "🗼",
  secret_garden: "🌙",
};

function timeContext() {
  const hour = new Date().getHours();
  if (hour < 11) {
    return { icon: "🌅", label: "아침", line: "공주님, 오늘도 좋은 아침입니다. 오늘은 어디로 가실까요?" };
  }
  if (hour < 18) {
    return { icon: "☀️", label: "낮", line: "공주님, 오늘 일정이 잘 진행되고 있습니다. 오늘은 어디로 가실까요?" };
  }
  return { icon: "🌙", label: "밤", line: "공주님, 오늘 하루도 정말 수고하셨습니다. 오늘은 어디로 가실까요?" };
}

// Home = Castle = 왕궁 로비. 카드 메뉴가 아니라 전체 화면 Scene 위에 얇은 HUD가
// 가장자리에 떠 있는 구조입니다. 중앙 Scene(공주/세린)은 항상 화면의 70~80% 이상을
// 그대로 유지하고, HUD 요소는 좌상단/우상단/우측/좌하단 네 군데에만 배치합니다.
export function HomeScene({ data, onNavigate, onVisitRoom, onCompleteQuest }: HomeSceneProps) {
  const [showRooms, setShowRooms] = useState(false);
  const [showHud, setShowHud] = useState(false);
  const [leavingKey, setLeavingKey] = useState<CastleRoomKey | null>(null);
  const time = timeContext();
  const todayEvents = getEventsByDay(data.events, TODAY);
  const nextEvent = getUpcomingEvents(data.events)[0];
  const speechLine = nextEvent
    ? `세린이 ${nextEvent.startAt.slice(11, 16)} ${nextEvent.title} 일정을 준비하고 있습니다.`
    : time.line;

  useEffect(() => {
    const hudTimer = window.setTimeout(() => setShowHud(true), 400);
    const roomTimer = window.setTimeout(() => setShowRooms(true), 900);
    return () => {
      window.clearTimeout(hudTimer);
      window.clearTimeout(roomTimer);
    };
  }, []);

  function enterRoom(room: CastleRoom) {
    if (leavingKey) return;
    setLeavingKey(room.key);
    onVisitRoom(room.key);
    window.setTimeout(() => onNavigate(room.route), 340);
  }

  return (
    <section className={`palace-hud-scene${leavingKey ? " leaving" : ""}`}>
      <div className="palace-hud-backdrop" style={{ backgroundImage: 'url("/assets/home-bg.webp")' }} />

      <div className="palace-hud-figures">
        <img className="hud-princess" src="/assets/princess-full-transparent.webp" alt="공주" />
        <img className="hud-serin" src="/assets/serin-full-transparent.webp" alt="세린" />
      </div>

      {/* 좌상단: 공주 상태 + 시간대 */}
      <div className={`hud-corner hud-top-left${showHud ? " visible" : ""}`}>
        <span className="hud-time-icon" aria-hidden="true">{time.icon}</span>
        <div>
          <strong>{data.princess.displayName}</strong>
          <span>Lv.{data.princess.level} · {time.label}</span>
        </div>
      </div>

      {/* 우상단: 오늘 일정/퀘스트 카운터 */}
      <div className={`hud-corner hud-top-right${showHud ? " visible" : ""}`}>
        <button type="button" className="hud-counter" onClick={() => onNavigate("calendar")}>
          <span className="hud-counter-icon">□</span>
          <strong>{todayEvents.length}</strong>
          <span>오늘 일정</span>
        </button>
        <button type="button" className="hud-counter" onClick={() => onNavigate("quests")}>
          <span className="hud-counter-icon">◆</span>
          <strong>{data.progress.todayCompletedQuests}/{data.progress.todayTotalQuests}</strong>
          <span>오늘 Quest</span>
        </button>
      </div>

      {/* 우측: Quest Tracker HUD */}
      {showHud && (
        <div className="hud-edge hud-right">
          <QuestTrackerHud quests={data.quests} todayDate={TODAY} onCompleteQuest={onCompleteQuest} />
        </div>
      )}

      {/* 좌하단: 세린 말풍선 */}
      <div className={`hud-corner hud-bottom-left${showHud ? " visible" : ""}`}>
        <div className="hud-speech-bubble">
          <p>{speechLine}</p>
        </div>
      </div>

      {/* 하단: 장소 이동 Pill (얇은 Dock, 화면을 덮지 않음) */}
      <nav className={`hud-room-dock${showRooms ? " visible" : ""}`} aria-label="장소 이동">
        {data.rooms
          .filter((room) => room.isDiscovered)
          .map((room) => (
            <button key={room.key} type="button" onClick={() => enterRoom(room)}>
              <span>{roomIcons[room.key]}</span>
              <span>{room.name}</span>
            </button>
          ))}
      </nav>
    </section>
  );
}
