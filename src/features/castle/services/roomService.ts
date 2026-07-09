import type { CastleRoom } from "../types/castle.types";

export function getVisibleRooms(rooms: CastleRoom[]) {
  return rooms;
}

export function getMostVisitedRoom(rooms: CastleRoom[]) {
  return [...rooms].sort((a, b) => b.visitedCount - a.visitedCount)[0] ?? null;
}
