import { useEffect, useState } from "react";
import type { AppMockData, ViewKey } from "../../app/types";
import type { CastleRoom, CastleRoomKey } from "../../features/castle/types/castle.types";
import { getEventsByDay, getUpcomingEvents } from "../../features/calendar/services/calendarService";
import { Badge } from "../design-system/Badge";
import { ProgressBar } from "../design-system/ProgressBar";

interface HomeSceneProps {
  data: AppMockData;
  activeView: ViewKey;
  onNavigate: (view: ViewKey) => void;
  onVisitRoom: (key: CastleRoomKey) => void;
}

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

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) {
    return { label: "좋은 아침입니다", line: "공주님, 오늘도 좋은 아침입니다. 오늘은 어디로 가실까요?" };
  }
  if (hour < 18) {
    return { label: "오늘의 왕궁", line: "공주님, 오늘 일정이 잘 진행되고 있습니다. 오늘은 어디로 가실까요?" };
  }
  return { label: "고요한 밤", line: "공주님, 오늘 하루도 정말 수고하셨습니다. 오늘은 어디로 가실까요?" };
}

// Home = Castle = Lobby. 앱을 열면 메뉴가 아니라 왕궁 로비에서 세린의 인사를 받고,
// 잠시 후 장소 선택 Pill이 부드럽게 등장합니다. 방을 고르면 짧은 전환 후 그 장소로 이동합니다.
export function HomeScene({ data, onNavigate, onVisitRoom }: HomeSceneProps) {
  const [showRooms, setShowRooms] = useState(false);
  const [leavingKey, setLeavingKey] = useState<CastleRoomKey | null>(null);
  const greeting = timeGreeting();
  const todayEvents = getEventsByDay(data.events, "2026-07-09");
  const nextEvent = getUpcomingEvents(data.events)[0];

  useEffect(() => {
    const timer = window.setTimeout(() => setShowRooms(true), 700);
    return () => window.clearTimeout(timer);
  }, []);

  function enterRoom(room: CastleRoom) {
    if (leavingKey) return;
    setLeavingKey(room.key);
    onVisitRoom(room.key);
    window.setTimeout(() => onNavigate(room.route), 320);
  }

  return (
    <section className={`palace-lobby${leavingKey ? " leaving" : ""}`}>
      <div className="palace-lobby-scene">
        <div className="palace-lobby-figures">
          <img className="lobby-princess" src="/assets/princess-full-transparent.png" alt="공주" />
          <img className="lobby-serin" src="/assets/serin-full-transparent.png" alt="세린" />
        </div>
        <div className="lobby-speech-bubble">
          <span>{greeting.label}</span>
          <p>{nextEvent ? `세린이 ${nextEvent.startAt.slice(11, 16)} ${nextEvent.title} 일정을 준비하고 있습니다.` : greeting.line}</p>
        </div>
      </div>

      <div className="lobby-today-strip" aria-label="오늘 요약">
        <button type="button" onClick={() => onNavigate("quests")}>
          <Badge tone="royal">Quest</Badge>
          <strong>{data.progress.todayCompletedQuests}/{data.progress.todayTotalQuests}</strong>
          <span>오늘 Quest</span>
        </button>
        <button type="button" onClick={() => onNavigate("calendar")}>
          <Badge tone="royal">Calendar</Badge>
          <strong>{todayEvents.length}</strong>
          <span>오늘 일정</span>
        </button>
        <div className="lobby-exp-card">
          <span>Princess EXP · Lv.{data.progress.level}</span>
          <ProgressBar value={data.progress.expRate} label="Princess EXP" />
        </div>
      </div>

      <nav className={`lobby-room-pills${showRooms ? " visible" : ""}`} aria-label="왕궁 장소 선택">
        {data.rooms.map((room) => (
          <button key={room.key} type="button" onClick={() => enterRoom(room)}>
            <span aria-hidden="true">{roomIcons[room.key] ?? "✦"}</span>
            <span>{room.name}</span>
          </button>
        ))}
      </nav>
    </section>
  );
}
