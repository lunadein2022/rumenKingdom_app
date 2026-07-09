import { useState } from "react";
import { upgradeRoom, visitRoom } from "../services/castleService";
import type { CastleRoom, CastleRoomKey } from "../types/castle.types";

export function useCastleRooms(initialRooms: CastleRoom[]) {
  const [rooms, setRooms] = useState(initialRooms);

  return {
    rooms,
    visitRoom: (key: CastleRoomKey) => setRooms((current) => visitRoom(current, key)),
    upgradeRoom: (key: CastleRoomKey) => setRooms((current) => upgradeRoom(current, key)),
  };
}
