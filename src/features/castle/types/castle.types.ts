export type CastleRoomKey =
  | "lobby"
  | "throne"
  | "library"
  | "office"
  | "garden"
  | "bedroom"
  | "tower"
  | "secret_garden";

export type CastleSeason = "spring" | "summer" | "autumn" | "winter";
export type CastleTimeOfDay = "morning" | "day" | "evening" | "night";

export interface CastleState {
  castleLevel: number;
  castleExp: number;
  requiredExp: number;
  castleTheme: "royal_blue" | "moonlight" | "garden";
  season: CastleSeason;
  timeOfDay: CastleTimeOfDay;
}

export interface CastleRoom {
  key: CastleRoomKey;
  name: string;
  subtitle: string;
  role: string;
  description: string;
  image: string;
  route: "home" | "quests" | "calendar" | "serin" | "castle" | "library" | "garden" | "progress" | "profile";
  unlockLevel: number;
  roomLevel: number;
  isUnlocked: boolean;
  isDiscovered: boolean;
  visitedCount: number;
  stats: string[];
  decorations: string[];
}

export interface RoomDecoration {
  id: string;
  roomKey: CastleRoomKey;
  decorationKey: string;
  isUnlocked: boolean;
  isEquipped: boolean;
}
