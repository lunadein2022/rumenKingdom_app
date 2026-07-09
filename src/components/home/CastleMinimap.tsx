import type { ViewKey } from "../../app/types";
import type { CastleRoom, CastleRoomKey } from "../../features/castle/types/castle.types";

interface CastleMinimapProps {
  rooms: CastleRoom[];
  currentRoomKey: CastleRoomKey;
  onFastTravel: (view: ViewKey) => void;
}

// 실제 지도가 아니라 왕궁 구조를 단순화한 미니맵입니다. 현재 위치를 표시하고,
// 각 방을 눌러 바로 Fast Travel할 수 있습니다. 해금 시스템은 없으므로 모든
// 방이 항상 이동 가능합니다.
const layoutOrder: CastleRoomKey[] = ["throne", "library", "lobby", "office", "garden", "bedroom"];

export function CastleMinimap({ rooms, currentRoomKey, onFastTravel }: CastleMinimapProps) {
  const byKey = new Map(rooms.map((room) => [room.key, room]));

  return (
    <section className="home-hud-panel castle-minimap-panel">
      <div className="home-hud-panel-head">
        <h2>왕궁 지도</h2>
        <span>Fast Travel</span>
      </div>
      <div className="castle-minimap-grid">
        {layoutOrder.map((key) => {
          const room = byKey.get(key);
          if (!room) return <span key={key} className="castle-minimap-slot empty" />;
          const isCurrent = key === currentRoomKey;
          return (
            <button
              key={key}
              type="button"
              className={`castle-minimap-node minimap-${key}${isCurrent ? " current" : ""}`}
              onClick={() => onFastTravel(room.route)}
              aria-label={`${room.name}로 이동`}
            >
              <span>{room.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
