import type { ViewKey } from "../../../app/types";
import type { CastleRoom } from "../types/castle.types";

interface CastleHubPageProps {
  rooms: CastleRoom[];
  activeView: ViewKey;
  onNavigate: (view: ViewKey) => void;
}

export function CastleHubPage({ rooms, onNavigate }: CastleHubPageProps) {
  return (
    <section className="website-scene castle-hub-scene">
      <div className="scene-shade" />
      <header className="scene-title-block">
        <span>Castle Navigator</span>
        <h1>루멘 왕성</h1>
        <p>모든 공간은 처음부터 열려 있습니다. 성장은 접근 제한이 아니라 공주님의 기록과 통계로 남습니다.</p>
      </header>

      <div className="castle-map-hud">
        <button type="button" className="castle-map-core" onClick={() => onNavigate("home")}>
          <span>♕</span>
          <strong>로비</strong>
        </button>
        {rooms.filter((room) => room.key !== "lobby").map((room, index) => (
          <button
            key={room.key}
            type="button"
            className={`castle-map-room room-orbit-${index}`}
            onClick={() => onNavigate(room.route)}
          >
            <span>{room.name}</span>
            <small>{room.role}</small>
          </button>
        ))}
      </div>

      <nav className="scene-fast-travel" aria-label="왕궁 빠른 이동">
        {rooms.map((room) => (
          <button key={room.key} type="button" onClick={() => onNavigate(room.route)}>
            <strong>{room.name}</strong>
            <span>{room.subtitle}</span>
          </button>
        ))}
      </nav>
    </section>
  );
}
