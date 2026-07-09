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
  | "quest.delete"
  | "quest.complete"
  | "calendar.create"
  | "calendar.update"
  | "calendar.delete"
  | "project.create"
  | "project.update"
  | "project.rename"
  | "diary.create"
  | "diary.update"
  | "diary.summarize"
  | "contact.extract"
  | "contact.create"
  | "contact.update"
  | "memory.save"
  | "memory.search"
  | "library.search"
  | "room.navigate"
  | "unknown";

export const intentCategoryMap: Record<SerinIntent, SerinIntentCategory> = {
  "chat.general": "conversation",
  "quest.create": "todo",
  "quest.update": "todo",
  "quest.delete": "todo",
  "quest.complete": "todo",
  "calendar.create": "calendar",
  "calendar.update": "calendar",
  "calendar.delete": "calendar",
  "project.create": "project",
  "project.update": "project",
  "project.rename": "project",
  "diary.create": "diary",
  "diary.update": "diary",
  "diary.summarize": "diary",
  "contact.extract": "relationship",
  "contact.create": "relationship",
  "contact.update": "relationship",
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
  | "action_log"
  | "clarify"
  | "error";

export type SerinRole = "user" | "serin" | "system";
export type SerinAttachmentType = "image" | "document" | "audio";

export interface SerinAttachment {
  id: string;
  type: SerinAttachmentType;
  name: string;
  url?: string;
  // mock 파이프라인 처리 결과(OCR/STT/요약)는 실제 서비스 연동 전까지 이 필드에
  // 채워집니다. TODO: 실제 OCR/STT/문서 요약 API 연동 시 이 자리에서 실데이터로 교체.
  mockExtract?: string;
}

export interface SerinParsedIntent {
  intent: SerinIntent;
  confidence: number;
  entities: Record<string, unknown>;
  needsConfirmation: boolean;
  // 확신이 낮아 곧바로 등록하지 않고 되물어야 하는 경우 세린이 보여줄 질문입니다.
  clarifyQuestion?: string;
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

// 세린이 실제로 무엇을 했는지 투명하게 보여주는 행동 로그 한 줄입니다.
// "등록했습니다"로 뭉뚱그리지 않고, 도메인별로 무엇이 어떻게 바뀌었는지 남깁니다.
export interface SerinActionLogEntry {
  id: string;
  domain: "calendar" | "quest" | "project" | "diary" | "memory" | "relationship" | "library";
  label: string;
  detail: string;
  timestamp: string;
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
    questUpdate?: { questId: string; changes: Partial<Quest> };
    questDelete?: { questId: string };
    calendar?: CalendarEventInput;
    calendarUpdate?: { eventId: string; changes: Partial<CalendarEventInput> };
    calendarDelete?: { eventId: string };
    mainQuest?: Partial<MainQuest>;
    mainQuestUpdate?: { mainQuestId: string; content: string };
    mainQuestRename?: { mainQuestId: string; newTitle: string };
    memory?: Omit<SerinMemory, "id" | "createdAt">;
    diary?: {
      title: string;
      content: string;
    };
    diaryEdit?: { entryId: string };
    contact?: Partial<RelationshipContact>;
  };
  // 확정되면 남길 행동 로그 항목들(도메인별로 여러 개일 수 있습니다).
  logEntries?: Array<Omit<SerinActionLogEntry, "id" | "timestamp">>;
}

export interface SerinTitledRef {
  id: string;
  title: string;
}

export interface SerinServiceMessageInput {
  conversationId: string;
  content: string;
  attachments?: SerinAttachment[];
  mainQuestTitles?: string[];
  // 수정/삭제 의도를 실제 항목과 매칭하기 위한 컨텍스트입니다.
  questRefs?: SerinTitledRef[];
  eventRefs?: SerinTitledRef[];
  contactRefs?: SerinTitledRef[];
}

export interface SerinExecutionResult {
  action: SerinAction | null;
  reply: string;
  status: SerinStatus;
}
