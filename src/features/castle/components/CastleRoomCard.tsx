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
    <article
      className={`castle-room-scene ${room.isUnlocked ? "unlocked" : "locked"}`}
      style={{ backgroundImage: `linear-gradient(180deg, rgba(16, 25, 54, 0.38), rgba(16, 25, 54, 0.74)), url(${room.image})` }}
    >
      <div className="castle-room-scene-copy">
        <Badge tone={room.isUnlocked ? "gold" : "soft"}>{room.subtitle}</Badge>
        <h2>{room.name}</h2>
        <p>{room.description}</p>
        <div className="castle-room-stats">
          {room.stats.map((stat) => <span key={stat}>{stat}</span>)}
        </div>
        <Button size="sm" onClick={onEnter} disabled={!room.isUnlocked}>
          {room.isUnlocked ? "입장" : `Lv.${room.unlockLevel} 해금`}
        </Button>
      </div>
      <RoomUnlockAnimation room={room} />
    </article>
  );
}
