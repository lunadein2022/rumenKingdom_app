export type ViewKey =
  | "home"
  | "quests"
  | "calendar"
  | "castle"
  | "achievements"
  | "inventory"
  | "serin"
  | "profile";

export type QuestStatus = "pending" | "inProgress" | "completed";

export interface UserProgress {
  level: number;
  currentExp: number;
  requiredExp: number;
  expRate: number;
  completedQuests: number;
  totalQuests: number;
  todayCompletedQuests: number;
  todayTotalQuests: number;
  todayProgress: number;
  pendingRewards: number;
  streakDays: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: QuestStatus;
  category: "routine" | "work" | "growth" | "care";
  priority: "low" | "medium" | "high";
  expReward: number;
  goldReward: number;
  dueDate: string;
  completedAt?: string;
  rewardClaimed: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  eventDate: string;
  roomKey: PalaceRoomKey;
}

export interface SerinProfile {
  name: string;
  role: "ai_maid" | "assistant";
  greetingTitle: string;
  greetingText: string;
  relationshipLabel: string;
  affinity: number;
}

export type PalaceRoomKey =
  | "lobby"
  | "garden"
  | "library"
  | "office"
  | "bedroom"
  | "throne";

export interface PalaceRoom {
  key: PalaceRoomKey;
  name: string;
  subtitle: string;
  description: string;
  image: string;
  route: ViewKey;
  stats: string[];
}

export interface PrincessProfile {
  displayName: string;
  activeTitle: string;
  level: number;
  currentExp: number;
  requiredExp: number;
  currentRoom: PalaceRoomKey;
  stats: {
    charm: number;
    wisdom: number;
    courage: number;
    diligence: number;
  };
  equippedItems: Array<{
    slot: string;
    name: string;
  }>;
  serinAffinity: number;
}

export interface UserTitle {
  key: string;
  name: string;
  unlocked: boolean;
  equipped: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  expReward: number;
  goldReward: number;
  unlocked: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  slot: string;
  equipped: boolean;
}

export interface AppMockData {
  princess: PrincessProfile;
  serin: SerinProfile;
  progress: UserProgress;
  titles: UserTitle[];
  quests: Quest[];
  events: CalendarEvent[];
  rooms: PalaceRoom[];
  achievements: Achievement[];
  inventory: InventoryItem[];
}
