import type { CalendarEventInput } from "../../calendar/types/calendar.types";
import type { MainQuest, Quest, RelationshipContact } from "../../../app/types";

export type SerinStatus = "idle" | "thinking" | "speaking" | "error";

// 세린은 AI 비서로서 대화를 아래 7가지 의도로 자동 분류합니다:
// Conversation(chat) / Calendar / Todo(quest) / Project(mainQuest) / Diary /
// Relationship(contact) / Search(library, memory).
export type SerinIntentCategory =
  | "conversation"
  | "calendar"
  | "todo"
  | "project"
  | "diary"
  | "relationship"
  | "search";

export type SerinIntent =
  | "chat.general"
  | "quest.create"
  | "quest.update"
  | "quest.complete"
  | "calendar.create"
  | "calendar.update"
  | "calendar.delete"
  | "project.create"
  | "project.update"
  | "diary.create"
  | "diary.summarize"
  | "contact.extract"
  | "contact.create"
  | "memory.save"
  | "memory.search"
  | "library.search"
  | "room.navigate"
  | "unknown";

export const intentCategoryMap: Record<SerinIntent, SerinIntentCategory> = {
  "chat.general": "conversation",
  "quest.create": "todo",
  "quest.update": "todo",
  "quest.complete": "todo",
  "calendar.create": "calendar",
  "calendar.update": "calendar",
  "calendar.delete": "calendar",
  "project.create": "project",
  "project.update": "project",
  "diary.create": "diary",
  "diary.summarize": "diary",
  "contact.extract": "relationship",
  "contact.create": "relationship",
  "memory.save": "search",
  "memory.search": "search",
  "library.search": "search",
  "room.navigate": "conversation",
  unknown: "conversation",
};

export type SerinMessageType =
  | "text"
  | "confirmation"
  | "quest_preview"
  | "calendar_preview"
  | "project_preview"
  | "contact_preview"
  | "diary_preview"
  | "memory_saved"
  | "system_notice"
  | "error";

export type SerinRole = "user" | "serin" | "system";
export type SerinAttachmentType = "image" | "document" | "audio";

export interface SerinAttachment {
  id: string;
  type: SerinAttachmentType;
  name: string;
  url?: string;
}

export interface SerinParsedIntent {
  intent: SerinIntent;
  confidence: number;
  entities: Record<string, unknown>;
  needsConfirmation: boolean;
}

export interface SerinMemory {
  id: string;
  memoryType: "preference" | "person" | "routine" | "goal" | "constraint" | "emotion" | "work" | "personal" | "system";
  content: string;
  importance: "low" | "medium" | "high" | "critical";
  source: "chat" | "confirmation" | "system";
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdAt: string;
}

export interface SerinAction {
  id: string;
  intent: SerinIntent;
  title: string;
  summary: string;
  confirmLabel: string;
  secondaryLabel?: string;
  payload: {
    quest?: Partial<Quest>;
    calendar?: CalendarEventInput;
    mainQuest?: Partial<MainQuest>;
    mainQuestUpdate?: { mainQuestId: string; content: string };
    memory?: Omit<SerinMemory, "id" | "createdAt">;
    diary?: {
      title: string;
      content: string;
    };
    contact?: Partial<RelationshipContact>;
  };
}

export interface SerinServiceMessageInput {
  conversationId: string;
  content: string;
  attachments?: SerinAttachment[];
  mainQuestTitles?: string[];
}

export interface SerinExecutionResult {
  action: SerinAction | null;
  reply: string;
  status: SerinStatus;
}
