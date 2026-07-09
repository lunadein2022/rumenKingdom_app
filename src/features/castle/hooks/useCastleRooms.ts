import { useEffect, useState } from "react";
import { normalizeRooms, upgradeRoom, visitRoom } from "../services/castleService";
import type { CastleRoom, CastleRoomKey } from "../types/castle.types";

export function useCastleRooms(initialRooms: CastleRoom[], _userLevel: number) {
  const [rooms, setRooms] = useState(() => normalizeRooms(initialRooms));

  useEffect(() => {
    setRooms((current) => normalizeRooms(current));
  }, []);

  return {
    rooms,
    normalizeRooms: () => setRooms((current) => normalizeRooms(current)),
    visitRoom: (key: CastleRoomKey) => setRooms((current) => visitRoom(current, key)),
    upgradeRoom: (key: CastleRoomKey) => setRooms((current) => upgradeRoom(current, key)),
  };
}
