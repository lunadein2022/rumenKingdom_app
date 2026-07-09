import { useState } from "react";
import type { ViewKey } from "../../../app/types";
import { CastleCarousel } from "../components/CastleCarousel";
import type { CastleRoom, CastleRoomKey, CastleState } from "../types/castle.types";

interface CastlePageProps {
  rooms: CastleRoom[];
  state: CastleState;
  onNavigate: (view: ViewKey) => void;
  onVisitRoom: (key: CastleRoomKey) => void;
  onUpgradeRoom: (key: CastleRoomKey) => void;
}

export function CastlePage({ rooms, state, onNavigate, onVisitRoom }: CastlePageProps) {
  const [activeRoomKey, setActiveRoomKey] = useState<CastleRoomKey>("lobby");
  const activeRoom = rooms.find((room) => room.key === activeRoomKey) ?? rooms[0];

  function enterRoom(room: CastleRoom) {
    onVisitRoom(room.key);
    onNavigate(room.route);
  }

  return (
    <section className="castle-domain-page alpha">
      <header className="castle-top-bar">
        <div>
          <span>Castle Score</span>
          <strong>루멘 왕성</strong>
        </div>
        <small>Lv.{state.castleLevel} · {state.castleExp}/{state.requiredExp} EXP</small>
      </header>

      <nav className="castle-fast-travel" aria-label="Castle rooms">
        {rooms.map((room) => (
          <button
            key={room.key}
            type="button"
            className={room.key === activeRoomKey ? "active" : ""}
            onClick={() => setActiveRoomKey(room.key)}
          >
            {room.name}
          </button>
        ))}
      </nav>

      <CastleCarousel
        rooms={rooms}
        activeRoomKey={activeRoom.key}
        onSelectRoom={setActiveRoomKey}
        onEnterRoom={enterRoom}
      />

      {activeRoom.key === "throne" && (
        <section className="throne-growth-links" aria-label="Throne growth shortcuts">
          <button type="button" onClick={() => onNavigate("progress")}>성장 현황</button>
          <button type="button" onClick={() => onNavigate("progress")}>업적 / 보상</button>
          <button type="button" onClick={() => onNavigate("profile")}>공주 캐릭터</button>
        </section>
      )}
    </section>
  );
}
