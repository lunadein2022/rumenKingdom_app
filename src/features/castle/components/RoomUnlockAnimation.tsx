import type { CastleRoom } from "../types/castle.types";

interface RoomUnlockAnimationProps {
  room: CastleRoom;
}

export function RoomUnlockAnimation({ room }: RoomUnlockAnimationProps) {
  if (room.isUnlocked) return null;

  return (
    <div className="room-lock-overlay">
      <strong>Lv.{room.unlockLevel} 해금</strong>
      <span>아직 문이 열리지 않았습니다.</span>
    </div>
  );
}
