import { Badge } from "../../../components/design-system/Badge";
import { Button } from "../../../components/design-system/Button";
import type { CastleRoom } from "../types/castle.types";
import { RoomUnlockAnimation } from "./RoomUnlockAnimation";

interface CastleRoomCardProps {
  room: CastleRoom;
  onEnter: () => void;
}

export function CastleRoomCard({ room, onEnter }: CastleRoomCardProps) {
  return (
    <article className={`castle-room-card ${room.isUnlocked ? "unlocked" : "locked"}`}>
      <img src={room.image} alt={room.name} />
      <div className="castle-room-copy">
        <Badge tone={room.isUnlocked ? "royal" : "soft"}>{room.subtitle}</Badge>
        <h2>{room.name}</h2>
        <p>{room.description}</p>
        <div className="castle-room-stats">
          {room.stats.map((stat) => <span key={stat}>{stat}</span>)}
        </div>
        <Button size="sm" onClick={onEnter} disabled={!room.isUnlocked}>입장</Button>
      </div>
      <RoomUnlockAnimation room={room} />
    </article>
  );
}
