import type { CastleRoom, CastleRoomKey } from "../types/castle.types";

export function getRoomByKey(rooms: CastleRoom[], key: CastleRoomKey) {
  // TODO: Replace with Supabase Query
  return rooms.find((room) => room.key === key) ?? rooms[0];
}
