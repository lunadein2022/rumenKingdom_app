import { useState } from "react";
import type { CastleRoom, CastleRoomKey } from "../types/castle.types";

// 해금 시스템이 없으므로 방 자체는 정적입니다. 여기서는 "지금 어느 방에
// 있는지"(currentRoomKey)만 추적해서 미니맵 하이라이트에 사용합니다.
export function useCastleRooms(initialRooms: CastleRoom[], initialRoomKey: CastleRoomKey = "lobby") {
  const [rooms] = useState(initialRooms);
  const [currentRoomKey, setCurrentRoomKey] = useState<CastleRoomKey>(initialRoomKey);

  return {
    rooms,
    currentRoomKey,
    visitRoom: (key: CastleRoomKey) => setCurrentRoomKey(key),
  };
}
