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

export function getRooms(rooms: CastleRoom[]) {
  // TODO: Replace with Supabase Query
  return rooms;
}

export function unlockRoom(rooms: CastleRoom[], key: CastleRoomKey) {
  // TODO: Replace with Supabase Query
  return rooms.map((room) =>
    room.key === key ? { ...room, isUnlocked: true, isDiscovered: true } : room,
  );
}

export function visitRoom(rooms: CastleRoom[], key: CastleRoomKey) {
  // TODO: Replace with Supabase Query
  return rooms.map((room) =>
    room.key === key ? { ...room, visitedCount: room.visitedCount + 1, isDiscovered: true } : room,
  );
}

export function upgradeRoom(rooms: CastleRoom[], key: CastleRoomKey) {
  // TODO: Replace with Supabase Query
  return rooms.map((room) =>
    room.key === key && room.isUnlocked ? { ...room, roomLevel: room.roomLevel + 1 } : room,
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
