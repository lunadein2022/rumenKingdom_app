export type CalendarCategory =
  | "work"
  | "personal"
  | "quest"
  | "routine"
  | "meeting"
  | "serin"
  | "rest"
  | "event";

export type CalendarPriority = "low" | "medium" | "high";
export type CalendarEventStatus = "scheduled" | "completed" | "cancelled";
export type CalendarCreatedBy = "user" | "serin" | "system";
export type CalendarViewMode = "month" | "day" | "timeline";
export type CalendarReminderStatus = "pending" | "sent" | "cancelled";

export interface CalendarCategoryMeta {
  label: string;
  icon: string;
  tone: "royal" | "gold" | "soft" | "success";
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt?: string;
  location?: string;
  category: CalendarCategory;
  priority: CalendarPriority;
  isAllDay: boolean;
  reminderMinutes?: number | null;
  reminderSentAt?: string | null;
  linkedQuestId?: string | null;
  status: CalendarEventStatus;
  createdBy: CalendarCreatedBy;
  createdAt?: string;
  updatedAt?: string;
}

export interface CalendarEventInput {
  title: string;
  description?: string;
  startAt: string;
  endAt?: string;
  location?: string;
  category: CalendarCategory;
  priority?: CalendarPriority;
  isAllDay?: boolean;
  reminderMinutes?: number | null;
  linkedQuestId?: string | null;
  createdBy?: CalendarCreatedBy;
}

export interface CalendarIntentDraft {
  title: string;
  startAt: string;
  endAt?: string;
  category: CalendarCategory;
  confidence: number;
  needsConfirmation: boolean;
  sourceMessage: string;
}

export interface CalendarReminder {
  id: string;
  eventId: string;
  remindAt: string;
  status: CalendarReminderStatus;
  sentAt?: string | null;
  createdAt: string;
}

export interface CalendarLinkedQuestResult {
  event: CalendarEvent;
  questTitle: string;
}

export const calendarCategoryMeta: Record<CalendarCategory, CalendarCategoryMeta> = {
  work: { label: "업무", icon: "Pen", tone: "royal" },
  personal: { label: "개인", icon: "Flower", tone: "soft" },
  quest: { label: "Quest", icon: "Scroll", tone: "gold" },
  routine: { label: "Routine", icon: "Refresh", tone: "soft" },
  meeting: { label: "회의", icon: "Handshake", tone: "royal" },
  serin: { label: "세린", icon: "Coffee", tone: "success" },
  rest: { label: "휴식", icon: "Bed", tone: "soft" },
  event: { label: "이벤트", icon: "Party", tone: "gold" },
};

export const reminderOptions = [
  { label: "없음", value: null },
  { label: "5분 전", value: 5 },
  { label: "10분 전", value: 10 },
  { label: "30분 전", value: 30 },
  { label: "1시간 전", value: 60 },
  { label: "하루 전", value: 1440 },
] as const;
