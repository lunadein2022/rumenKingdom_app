import { useState } from "react";
import { Badge } from "../../../components/design-system/Badge";
import type { ViewKey } from "../../../app/types";
import { CastleCarousel } from "../components/CastleCarousel";
import { CastleProgressCard } from "../components/CastleProgressCard";
import { RoomUpgradeCard } from "../components/RoomUpgradeCard";
import type { CastleRoom, CastleRoomKey, CastleState } from "../types/castle.types";

interface CastlePageProps {
  rooms: CastleRoom[];
  state: CastleState;
  onNavigate: (view: ViewKey) => void;
  onVisitRoom: (key: CastleRoomKey) => void;
  onUpgradeRoom: (key: CastleRoomKey) => void;
}

export function CastlePage({ rooms, state, onNavigate, onVisitRoom, onUpgradeRoom }: CastlePageProps) {
  const [activeRoomKey, setActiveRoomKey] = useState<CastleRoomKey>("lobby");
  const activeRoom = rooms.find((room) => room.key === activeRoomKey) ?? rooms[0];

  function enterRoom(room: CastleRoom) {
    onVisitRoom(room.key);
    onNavigate(room.route);
  }

  return (
    <section className="castle-domain-page">
      <header className="castle-hero">
        <Badge tone="gold">Castle Domain</Badge>
        <h1>루멘 왕성</h1>
        <p>왕성은 메뉴가 아니라 Princess OS의 지도입니다. 방을 선택해 기능이 있는 장소로 이동하세요.</p>
      </header>

      <nav className="castle-fast-travel" aria-label="Castle fast travel">
        {rooms.map((room) => (
          <button
            key={room.key}
            type="button"
            className={room.key === activeRoomKey ? "active" : ""}
            disabled={!room.isUnlocked}
            onClick={() => setActiveRoomKey(room.key)}
          >
            {room.name}
          </button>
        ))}
      </nav>

      <CastleProgressCard state={state} />
      <CastleCarousel
        rooms={rooms}
        activeRoomKey={activeRoomKey}
        onSelectRoom={setActiveRoomKey}
        onEnterRoom={enterRoom}
      />
      <RoomUpgradeCard room={activeRoom} onUpgrade={() => onUpgradeRoom(activeRoom.key)} />
    </section>
  );
}
