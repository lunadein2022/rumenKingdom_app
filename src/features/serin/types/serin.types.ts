import type { CalendarEventInput } from "../../calendar/types/calendar.types";
import type { Quest } from "../../../app/types";

export type SerinStatus = "idle" | "thinking" | "speaking" | "error";

export type SerinIntent =
  | "chat.general"
  | "quest.create"
  | "quest.update"
  | "quest.complete"
  | "calendar.create"
  | "calendar.update"
  | "calendar.delete"
  | "diary.create"
  | "diary.summarize"
  | "contact.extract"
  | "contact.create"
  | "memory.save"
  | "memory.search"
  | "library.search"
  | "room.navigate"
  | "reward.claim"
  | "unknown";

export type SerinMessageType =
  | "text"
  | "confirmation"
  | "quest_preview"
  | "calendar_preview"
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
    memory?: Omit<SerinMemory, "id" | "createdAt">;
    diary?: {
      title: string;
      content: string;
    };
    contact?: {
      name: string;
      phone?: string;
      email?: string;
      organization?: string;
      position?: string;
      memo?: string;
    };
  };
}

export interface SerinServiceMessageInput {
  conversationId: string;
  content: string;
  attachments?: SerinAttachment[];
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface SerinExecutionResult {
  action: SerinAction | null;
  reply: string;
  status: SerinStatus;
}
