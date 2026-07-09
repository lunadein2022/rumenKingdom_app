import { Button } from "../../../components/design-system/Button";
import type { CastleRoom } from "../types/castle.types";

interface RoomUpgradeCardProps {
  room: CastleRoom;
  onUpgrade: () => void;
}

export function RoomUpgradeCard({ room, onUpgrade }: RoomUpgradeCardProps) {
  return (
    <section className="room-upgrade-card">
      <div>
        <strong>{room.name} Lv.{room.roomLevel}</strong>
        <span>{room.decorations.length}개 장식 활성화</span>
      </div>
      <Button size="sm" onClick={onUpgrade} disabled={!room.isUnlocked}>방 성장</Button>
    </section>
  );
}
