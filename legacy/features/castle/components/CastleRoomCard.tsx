import { Badge } from "../../../components/design-system/Badge";
import { Button } from "../../../components/design-system/Button";
import type { CastleRoom } from "../types/castle.types";

interface CastleRoomCardProps {
  room: CastleRoom;
  onEnter: () => void;
}

export function CastleRoomCard({ room, onEnter }: CastleRoomCardProps) {
  return (
    <article
      className="castle-room-scene"
      style={{ backgroundImage: `linear-gradient(180deg, rgba(16, 25, 54, 0.28), rgba(16, 25, 54, 0.68)), url(${room.image})` }}
    >
      <div className="castle-room-scene-copy">
        <Badge tone="royal">{room.subtitle}</Badge>
        <h2>{room.name}</h2>
        <p>{room.description}</p>
        <div className="castle-room-stats">
          {room.stats.map((stat) => <span key={stat}>{stat}</span>)}
        </div>
        <Button size="sm" onClick={onEnter}>이동</Button>
      </div>
    </article>
  );
}
