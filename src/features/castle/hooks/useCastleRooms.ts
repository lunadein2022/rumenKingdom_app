import { useEffect, useState } from "react";
import { checkRoomUnlocks, upgradeRoom, visitRoom } from "../services/castleService";
import type { CastleRoom, CastleRoomKey } from "../types/castle.types";

export function useCastleRooms(initialRooms: CastleRoom[], userLevel: number) {
  const [rooms, setRooms] = useState(() => checkRoomUnlocks(initialRooms, userLevel));

  useEffect(() => {
    setRooms((current) => checkRoomUnlocks(current, userLevel));
  }, [userLevel]);

  return {
    rooms,
    checkRoomUnlocks: () => setRooms((current) => checkRoomUnlocks(current, userLevel)),
    visitRoom: (key: CastleRoomKey) => setRooms((current) => visitRoom(current, key)),
    upgradeRoom: (key: CastleRoomKey) => setRooms((current) => upgradeRoom(current, key)),
  };
}
