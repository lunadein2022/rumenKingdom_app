import type { ViewKey } from "../../../app/types";

export type CastleRoomKey =
  | "lobby"
  | "throne"
  | "library"
  | "office"
  | "garden"
  | "bedroom";

// Castle(왕성)은 기능이 아니라 공간입니다. 해금(unlock) 시스템은 제외합니다 —
// 모든 방은 항상 이동 가능하고, Castle 자체의 레벨/경험치 개념도 두지 않습니다.
// 성장(레벨/EXP/칭호)은 전부 Throne(왕좌의 방)에서만 다룹니다.
export interface CastleRoom {
  key: CastleRoomKey;
  name: string;
  subtitle: string;
  role: string;
  description: string;
  image: string;
  route: ViewKey;
  stats: string[];
}
