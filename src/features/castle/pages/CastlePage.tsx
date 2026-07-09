import { useState } from "react";
import type { ViewKey } from "../../../app/types";
import { Badge } from "../../../components/design-system/Badge";
import { ProgressBar } from "../../../components/design-system/ProgressBar";
import { CastleCarousel } from "../components/CastleCarousel";
import type { CastleRoom, CastleRoomKey, CastleState } from "../types/castle.types";

interface CastlePageProps {
  rooms: CastleRoom[];
  castleState: CastleState;
  onNavigate: (view: ViewKey) => void;
  onVisitRoom: (key: CastleRoomKey) => void;
}

// Castle은 Home(로비)과 분리된, 방 이동을 위한 허브입니다. Home이 하루를 시작하는
// 곳이라면 Castle은 왕성의 각 공간(집무실/도서관/정원/침실/왕좌의 방 등)을
// Swipe/Arrow/Fast Travel로 둘러보고 들어가는 곳입니다.
export function CastlePage({ rooms, castleState, onNavigate, onVisitRoom }: CastlePageProps) {
  const discoveredRooms = rooms.filter((room) => room.isDiscovered);
  const [activeIndex, setActiveIndex] = useState(0);
  const expPercent = Math.round((castleState.castleExp / castleState.requiredExp) * 100);

  function enterRoom(room: CastleRoom) {
    onVisitRoom(room.key);
    onNavigate(room.route);
  }

  return (
    <section className="castle-domain-page">
      <header className="castle-hero">
        <Badge tone="gold">Castle Domain</Badge>
        <h1>루멘 왕성</h1>
        <p>스와이프하거나 화살표로 방을 둘러보고, 아래 Fast Travel로 원하는 방에 바로 이동할 수 있습니다.</p>
      </header>

      <div className="castle-progress-card">
        <strong>왕성 Lv.{castleState.castleLevel}</strong>
        <ProgressBar value={expPercent} label="왕성 성장도" />
        <span>{castleState.castleExp} / {castleState.requiredExp} EXP</span>
      </div>

      <nav className="castle-fast-travel" aria-label="Fast Travel">
        {discoveredRooms.map((room, index) => (
          <button
            key={room.key}
            type="button"
            className={index === activeIndex ? "active" : ""}
            onClick={() => setActiveIndex(index)}
          >
            {room.name}
          </button>
        ))}
      </nav>

      <CastleCarousel
        rooms={discoveredRooms}
        activeIndex={activeIndex}
        onChangeIndex={setActiveIndex}
        onEnter={enterRoom}
      />
    </section>
  );
}
