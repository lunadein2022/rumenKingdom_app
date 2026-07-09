import type { PalaceRoom, ViewKey } from "../../app/types";
import { Badge } from "../design-system/Badge";
import { Button } from "../design-system/Button";

interface PalaceRoomSectionProps {
  rooms: PalaceRoom[];
  onNavigate: (view: ViewKey) => void;
}

export function PalaceRoomSection({ rooms, onNavigate }: PalaceRoomSectionProps) {
  return (
    <section className="palace-map" aria-label="Palace rooms">
      {rooms.map((room) => (
        <article className="palace-room" key={room.key}>
          <div className="room-image" style={{ backgroundImage: `url(${room.image})` }} />
          <div className="room-content">
            <Badge tone="soft">{room.subtitle}</Badge>
            <h3>{room.name}</h3>
            <p>{room.description}</p>
            <div className="room-stats">
              {room.stats.map((stat) => <span key={stat}>{stat}</span>)}
            </div>
            <Button size="sm" onClick={() => onNavigate(room.route)}>
              이동
            </Button>
          </div>
        </article>
      ))}
    </section>
  );
}
