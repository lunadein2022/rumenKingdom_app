import { Button } from "../../../components/design-system/Button";
import type { CastleRoom } from "../types/castle.types";

interface CastleRoomCardProps {
  room: CastleRoom;
  onEnter: (room: CastleRoom) => void;
}

// 각 방은 카드가 아니라 화면 대부분을 채우는 full-screen room scene으로 보입니다.
export function CastleRoomCard({ room, onEnter }: CastleRoomCardProps) {
  return (
    <article className="castle-room-card" style={{ backgroundImage: `url(${room.image})` }}>
      <div className="castle-room-card-overlay">
        <div className="castle-room-copy">
          <span>{room.subtitle}</span>
          <h2>{room.name}</h2>
          <p>{room.role}</p>
          <div className="castle-room-stats">
            {room.stats.map((stat) => (
              <span key={stat}>{stat}</span>
            ))}
          </div>
          <Button onClick={() => onEnter(room)}>입장하기</Button>
        </div>
      </div>
    </article>
  );
}
