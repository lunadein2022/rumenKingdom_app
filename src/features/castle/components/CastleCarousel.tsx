import { useRef } from "react";
import type { TouchEvent } from "react";
import type { CastleRoom } from "../types/castle.types";
import { CastleRoomCard } from "./CastleRoomCard";

interface CastleCarouselProps {
  rooms: CastleRoom[];
  activeIndex: number;
  onChangeIndex: (index: number) => void;
  onEnter: (room: CastleRoom) => void;
}

// Arrow 버튼과 Swipe(터치 드래그) 둘 다로 방을 넘길 수 있는 캐러셀입니다.
export function CastleCarousel({ rooms, activeIndex, onChangeIndex, onEnter }: CastleCarouselProps) {
  const touchStartX = useRef<number | null>(null);
  const room = rooms[activeIndex];

  function goPrev() {
    onChangeIndex((activeIndex - 1 + rooms.length) % rooms.length);
  }

  function goNext() {
    onChangeIndex((activeIndex + 1) % rooms.length);
  }

  function handleTouchStart(event: TouchEvent) {
    touchStartX.current = event.touches[0].clientX;
  }

  function handleTouchEnd(event: TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = event.changedTouches[0].clientX - touchStartX.current;
    if (delta > 48) goPrev();
    else if (delta < -48) goNext();
    touchStartX.current = null;
  }

  if (!room) {
    return <p className="small-copy">아직 발견한 방이 없습니다.</p>;
  }

  return (
    <div className="castle-carousel">
      <div className="castle-carousel-controls">
        <button type="button" onClick={goPrev} aria-label="이전 방">
          ‹
        </button>
        <strong>
          {room.name} · {activeIndex + 1}/{rooms.length}
        </strong>
        <button type="button" onClick={goNext} aria-label="다음 방">
          ›
        </button>
      </div>
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <CastleRoomCard room={room} onEnter={onEnter} />
      </div>
    </div>
  );
}
