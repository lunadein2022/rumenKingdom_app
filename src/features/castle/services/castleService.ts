import type { CastleRoom, CastleRoomKey, CastleState } from "../types/castle.types";

export function getCastleState(): CastleState {
  // TODO: Replace with Supabase Query
  return {
    castleLevel: 7,
    castleExp: 860,
    requiredExp: 1200,
    castleTheme: "royal_blue",
    season: "summer",
    timeOfDay: "morning",
  };
}

export function normalizeRoomState(room: CastleRoom): CastleRoom {
  return { ...room, isDiscovered: true };
}

export function normalizeRooms(rooms: CastleRoom[]) {
  return rooms.map((room) => normalizeRoomState(room));
}

export function getRooms(rooms: CastleRoom[]) {
  // TODO: Replace with Supabase Query
  return normalizeRooms(rooms);
}

export function visitRoom(rooms: CastleRoom[], key: CastleRoomKey) {
  // TODO: Replace with Supabase Query
  return rooms.map((room) =>
    room.key === key ? { ...room, visitedCount: room.visitedCount + 1, isDiscovered: true } : room,
  );
}

export function upgradeRoom(rooms: CastleRoom[], key: CastleRoomKey) {
  // TODO: Replace with Supabase Query. This is room score growth.
  return rooms.map((room) =>
    room.key === key ? { ...room, roomLevel: room.roomLevel + 1 } : room,
  );
}

export function addCastleExp(state: CastleState, exp: number): CastleState {
  // TODO: Replace with Supabase Query or RPC transaction
  const nextExp = state.castleExp + exp;
  if (nextExp >= state.requiredExp) {
    return {
      ...state,
      castleLevel: state.castleLevel + 1,
      castleExp: nextExp - state.requiredExp,
      requiredExp: Math.round(state.requiredExp * 1.2),
    };
  }
  return { ...state, castleExp: nextExp };
}
