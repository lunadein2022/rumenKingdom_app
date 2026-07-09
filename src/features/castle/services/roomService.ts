import type { CastleRoom, CastleRoomKey } from "../types/castle.types";

export function getRoomByKey(rooms: CastleRoom[], key: CastleRoomKey) {
  // TODO: Replace with Supabase Query
  return rooms.find((room) => room.key === key) ?? rooms[0];
}

export function getUnlockedRooms(rooms: CastleRoom[]) {
  // TODO: Replace with Supabase Query
  return rooms.filter((room) => room.isUnlocked);
}

export function getNextUnlockRoom(rooms: CastleRoom[], castleLevel: number) {
  // TODO: Replace with Supabase Query
  return rooms
    .filter((room) => !room.isUnlocked && room.unlockLevel > castleLevel)
    .sort((a, b) => a.unlockLevel - b.unlockLevel)[0];
}
