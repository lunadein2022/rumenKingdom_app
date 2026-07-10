import type { CalendarEvent } from "../features/calendar/types/calendar.types";
import type { CastleRoom } from "../features/castle/types/castle.types";
import type { SerinMessageType } from "../features/serin/types/serin.types";

// Princess OS Core Architecture v2.
// Home(로비) = 시작 화면(최소 브리핑). Castle(왕성) = 공간 이동 허브(기능이 아니라 공간).
// Office = 메인퀘스트(=프로젝트) 관리. Quest = 일일/서브/반복/스토리 퀘스트 실행.
// Library = 기록 보관소(Notion형 검색/필터). Bedroom = 다이어리. Garden = 순수 힐링.
// Throne = 성장(레벨/칭호/누적 통계). Relationship = 인연록(독립 도메인).
export type ViewKey =
  | "home"
  | "castle"
  | "office"
  | "quests"
  | "calendar"
  | "serin"
  | "library"
  | "bedroom"
  | "garden"
  | "throne"
  | "relationship";

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

// -----------------------------------------------------------------------
// Quest 체계: 메인퀘스트(=프로젝트)와 실행형 퀘스트(일일/서브/반복/스토리)는
// 서로 다른 모델입니다. 메인퀘스트는 Office가 관리하는 장기 프로젝트 단위이고,
// 아래 Quest는 그 프로젝트 아래(또는 독립적으로) 실행되는 작은 실행 단위입니다.
// -----------------------------------------------------------------------
export type QuestStatus = "pending" | "inProgress" | "completed";
// 퀘스트 계층: 메인(=프로젝트, MainQuest 모델) → 서브(side, 며칠~몇 주 업무)
// → 일일(daily, 오늘 할 일). 반복/스토리 타입은 제거되었습니다.
export type QuestType = "side" | "daily";
export type QuestCompletionEventType =
  | "check"
  | "glow"
  | "exp"
  | "reward"
  | "level"
  | "title"
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
  // 이 실행 퀘스트가 속한 메인퀘스트(프로젝트). 없으면 독립 퀘스트입니다.
  mainQuestId?: string;
  progress: number;
  expReward: number;
  goldReward: number;
  rewardItem?: string;
  dueDate: string;
  completedAt?: string;
  rewardClaimed: boolean;
  source: "manual" | "serin" | "calendar" | "system";
}

// -----------------------------------------------------------------------
// 메인퀘스트 = 프로젝트. Princess OS에서는 이 둘을 분리하지 않습니다. 사용자에게는
// "메인퀘스트"로 보이지만, 데이터 구조상으로는 장기 프로젝트 관리 단위(챕터/
// 서브퀘스트/일일퀘스트/반복퀘스트/일정/업데이트로그/인연/첨부파일/보상)로
// 동작합니다. Office가 이 도메인을 관리합니다.
// -----------------------------------------------------------------------
export type MainQuestStatus = "active" | "onHold" | "completed";

export interface MainQuestChapter {
  id: string;
  title: string;
  done: boolean;
}

export interface MainQuestUpdate {
  id: string;
  date: string;
  content: string;
  author: "princess" | "serin";
}

export interface MainQuestFile {
  id: string;
  name: string;
  addedAt: string;
}

export interface MainQuest {
  id: string;
  title: string;
  description: string;
  status: MainQuestStatus;
  progress: number;
  priority: "low" | "medium" | "high";
  startDate: string;
  dueDate: string;
  chapters: MainQuestChapter[];
  subQuestIds: string[];
  dailyQuestIds: string[];
  routineQuestIds: string[];
  linkedCalendarEventIds: string[];
  updates: MainQuestUpdate[];
  relatedContactIds: string[];
  attachedFiles: MainQuestFile[];
  rewardExp: number;
  rewardGold: number;
  expTotal: number;
  createdAt: string;
  updatedAt: string;
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

// Castle(왕성)은 기능이 아니라 공간입니다. 해금 시스템은 제외합니다 — 모든
// 방은 항상 이동 가능합니다.
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

// 인연록(Relationship) — 왕국도서관과 별도인 독립 도메인입니다.
export interface RelationshipContact {
  id: string;
  name: string;
  affinity: number;
  organization?: string;
  position?: string;
  phone?: string;
  email?: string;
  memo?: string;
  lastContactAt?: string;
  lastMeetingAt?: string;
  relatedMainQuestIds: string[];
  aiSummary?: string;
}

// 다이어리(Bedroom) — 오늘 일정/완료 퀘스트/프로젝트 업데이트를 자동으로
// 모아 보여주고, 느낀 점을 기록하는 공간입니다.
export interface DiaryEntry {
  id: string;
  date: string;
  moodEmoji: string;
  moodLabel: string;
  content: string;
  aiSummary?: string;
  linkedEventTitles: string[];
  linkedQuestTitles: string[];
  linkedMainQuestUpdates: string[];
}

export interface AppMockData {
  princess: PrincessProfile;
  serin: SerinProfile;
  progress: UserProgress;
  titles: UserTitle[];
  quests: Quest[];
  questHistory: QuestHistoryEntry[];
  mainQuests: MainQuest[];
  events: CalendarEvent[];
  serinMessages: SerinMessage[];
  rooms: CastleRoom[];
  achievements: Achievement[];
  inventory: InventoryItem[];
  contacts: RelationshipContact[];
  diaryEntries: DiaryEntry[];
}
