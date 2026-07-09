import { Badge } from "../../../components/design-system/Badge";
import { Button } from "../../../components/design-system/Button";
import type { CastleRoom } from "../types/castle.types";

interface CastleRoomCardProps {
  room: CastleRoom;
  onEnter: () => void;
}

export function CastleRoomCard({ room, onEnter }: CastleRoomCardProps) {
  return (
    <article className="castle-room-card scene">
      <img src={room.image} alt={room.name} />
      <div className="castle-room-copy">
        <Badge tone="royal">{room.subtitle} · Lv.{room.roomLevel}</Badge>
        <h2>{room.name}</h2>
        <p>{room.description}</p>
        <div className="castle-room-stats">
          {room.stats.map((stat) => <span key={stat}>{stat}</span>)}
        </div>
        <Button size="sm" onClick={onEnter}>입장</Button>
      </div>
    </article>
  );
}
