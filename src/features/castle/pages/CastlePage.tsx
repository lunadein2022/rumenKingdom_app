import { useState } from "react";
import type { ViewKey } from "../../../app/types";
import { Badge } from "../../../components/design-system/Badge";
import { CastleCarousel } from "../components/CastleCarousel";
import type { CastleRoom, CastleRoomKey } from "../types/castle.types";

interface CastlePageProps {
  rooms: CastleRoom[];
  onNavigate: (view: ViewKey) => void;
  onVisitRoom: (key: CastleRoomKey) => void;
}

// Castle은 기능이 아니라 "공간"입니다. 해금 시스템은 없습니다 — 모든 방은
// 항상 이동 가능합니다. Swipe / Arrow / Fast Travel 세 방식으로 방을 둘러보고
// 들어갈 수 있습니다. 성장(레벨/EXP)은 여기서 다루지 않고 Throne이 전담합니다.
export function CastlePage({ rooms, onNavigate, onVisitRoom }: CastlePageProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  function enterRoom(room: CastleRoom) {
    onVisitRoom(room.key);
    onNavigate(room.route);
  }

  return (
    <section className="castle-domain-page">
      <header className="castle-hero">
        <Badge tone="gold">Castle</Badge>
        <h1>루멘 왕성</h1>
        <p>스와이프하거나 화살표로 공간을 둘러보고, 아래 Fast Travel로 원하는 곳에 바로 이동할 수 있습니다.</p>
      </header>

      <nav className="castle-fast-travel" aria-label="Fast Travel">
        {rooms.map((room, index) => (
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
        rooms={rooms}
        activeIndex={activeIndex}
        onChangeIndex={setActiveIndex}
        onEnter={enterRoom}
      />
    </section>
  );
}
