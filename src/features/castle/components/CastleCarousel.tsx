import type { CastleRoom, CastleRoomKey } from "../types/castle.types";
import { CastleRoomCard } from "./CastleRoomCard";

interface CastleCarouselProps {
  rooms: CastleRoom[];
  activeRoomKey: CastleRoomKey;
  onSelectRoom: (key: CastleRoomKey) => void;
  onEnterRoom: (room: CastleRoom) => void;
}

export function CastleCarousel({ rooms, activeRoomKey, onSelectRoom, onEnterRoom }: CastleCarouselProps) {
  const activeIndex = Math.max(0, rooms.findIndex((room) => room.key === activeRoomKey));
  const activeRoom = rooms[activeIndex] ?? rooms[0];

  function move(delta: number) {
    const nextIndex = (activeIndex + delta + rooms.length) % rooms.length;
    onSelectRoom(rooms[nextIndex].key);
  }

  return (
    <section className="castle-carousel">
      <div className="castle-carousel-controls">
        <button type="button" onClick={() => move(-1)} aria-label="이전 방">‹</button>
        <strong>{activeIndex + 1} / {rooms.length}</strong>
        <button type="button" onClick={() => move(1)} aria-label="다음 방">›</button>
      </div>
      <div className="castle-swipe-track">
        {rooms.map((room) => (
          <button
            key={room.key}
            type="button"
            className={room.key === activeRoomKey ? "active" : ""}
            onClick={() => onSelectRoom(room.key)}
          >
            {room.name}
          </button>
        ))}
      </div>
      <CastleRoomCard room={activeRoom} onEnter={() => onEnterRoom(activeRoom)} />
    </section>
  );
}
