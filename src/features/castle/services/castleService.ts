// Castle(왕성)은 기능이 아니라 공간입니다. 해금(unlock)/Castle 레벨-EXP 시스템은
// v2 아키텍처에서 제외되었습니다. 성장(레벨/EXP/칭호)은 Throne(왕좌의 방)에서만
// 다룹니다. 이 서비스는 방 조회만 남습니다 — 방 상태(레벨/방문수/장식)는 더 이상
// 존재하지 않습니다.
import type { CastleRoom, CastleRoomKey } from "../types/castle.types";

export function getRooms(rooms: CastleRoom[]) {
  // TODO: Replace with Supabase Query
  return rooms;
}

export function getRoomByKey(rooms: CastleRoom[], key: CastleRoomKey) {
  return rooms.find((room) => room.key === key) ?? rooms[0];
}
