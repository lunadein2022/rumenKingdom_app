import type { CalendarEvent } from "../features/calendar/types/calendar.types";
import type { CastleRoom } from "../features/castle/types/castle.types";
import type { SerinMessageType } from "../features/serin/types/serin.types";

export type ViewKey =
  | "home"
  | "quests"
  | "calendar"
  | "serin"
  | "castle"
  | "library"
  | "garden"
  | "bedroom"
  | "progress"
  | "profile";

export type {
  CalendarEvent,
  CalendarEventInput,
  CalendarIntentDraft,
} from "../features/calendar/types/calendar.types";
export type {
  SerinAction,
  SerinMemory,
  SerinMessageType,
  SerinStatus,
} from "../features/serin/types/serin.types";

export type QuestStatus = "pending" | "inProgress" | "completed";
export type QuestType = "main" | "side" | "daily" | "routine" | "story";
export type QuestCompletionEventType =
  | "check"
  | "glow"
  | "exp"
  | "reward"
  | "level"
  | "castle"
  | "achievement"
  | "notification"
  | "history";

export interface QuestReward {
  exp: number;
  gold: number;
  item?: string;
  title?: string;
}

export interface QuestHistoryEntry {
  id: string;
  questId: string;
  completedAt: string;
  rewardExp: number;
  rewardItem?: string;
  note: string;
}

export interface QuestCompletionEvent {
  type: QuestCompletionEventType;
  label: string;
}

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
  type: QuestType;
  title: string;
  description: string;
  status: QuestStatus;
  category: "routine" | "work" | "growth" | "care";
  priority: "low" | "medium" | "high";
  chapter?: string;
  parentId?: string;
  progress: number;
  expReward: number;
  goldReward: number;
  rewardItem?: string;
  dueDate: string;
  completedAt?: string;
  rewardClaimed: boolean;
  source: "manual" | "serin" | "calendar" | "system";
}

export interface SerinMessage {
  id: string;
  sender: "princess" | "serin";
  content: string;
  createdAt: string;
  messageType?: SerinMessageType;
  metadata?: Record<string, unknown>;
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
  questHistory: QuestHistoryEntry[];
  events: CalendarEvent[];
  serinMessages: SerinMessage[];
  rooms: CastleRoom[];
  achievements: Achievement[];
  inventory: InventoryItem[];
}
