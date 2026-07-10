import { useState } from "react";
import type { ViewKey } from "../../../app/types";
import { Badge } from "../../../components/design-system/Badge";
import { CastleCarousel } from "../components/CastleCarousel";
import type { CastleRoom, CastleRoomKey } from "../types/castle.types";

interface CastlePageProps {
  rooms: CastleRoom[];
  currentRoomKey?: CastleRoomKey;
  onNavigate: (view: ViewKey) => void;
  onVisitRoom: (key: CastleRoomKey) => void;
}

// Castle은 기능이 아니라 "공간"입니다. 해금 시스템은 없습니다 — 모든 방은
// 항상 이동 가능합니다. Swipe / Arrow / Fast Travel 세 방식으로 방을 둘러보고
// 들어갈 수 있습니다. 성장(레벨/EXP)은 여기서 다루지 않고 Throne이 전담합니다.
//
// Fast Travel 바는 예전엔 방 이름만 나열하는 단순 탭이었습니다. 지금은 각 방의
// 첫 번째 stat(예: "진행 중 3")을 이름 아래에 함께 보여주고, 실제로 마지막에
// "입장"한 방(currentRoomKey)에 "현재 위치" 표시를 추가해 미니맵이 실제
// 정보를 담도록 했습니다.
export function CastlePage({ rooms, currentRoomKey, onNavigate, onVisitRoom }: CastlePageProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  function enterRoom(room: CastleRoom) {
    onVisitRoom(room.key);
    onNavigate(room.route);
  }

  return (
    <section className="castle-domain-page scene-fullbleed">
      <img className="scene-center-princess" src="/assets/princess-full-transparent.webp" alt="공주" />
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
            className={[
              index === activeIndex ? "active" : "",
              room.key === currentRoomKey ? "current" : "",
            ].join(" ")}
            onClick={() => setActiveIndex(index)}
          >
            <strong>{room.name}</strong>
            {room.stats[0] && <small>{room.stats[0]}</small>}
            {room.key === currentRoomKey && <em>현재 위치</em>}
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
