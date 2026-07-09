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
  isAllDay?: boolean;
  // "8월 19일부터 3일간" 처럼 기간이 있는 일정인지 여부. Month View에서
  // 기간형 bar로 표시할지, 단일 일정 점으로 표시할지 결정하는 데 씁니다.
  isMultiDay?: boolean;
  category: CalendarCategory;
  confidence: number;
  needsConfirmation: boolean;
  sourceMessage: string;
  confirmSummary?: string;
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
  work: { label: "Work", icon: "Pen", tone: "royal" },
  personal: { label: "Personal", icon: "Flower", tone: "soft" },
  quest: { label: "Quest", icon: "Scroll", tone: "gold" },
  routine: { label: "Routine", icon: "Refresh", tone: "soft" },
  meeting: { label: "Meeting", icon: "Handshake", tone: "royal" },
  serin: { label: "Serin", icon: "Coffee", tone: "success" },
  rest: { label: "Rest", icon: "Bed", tone: "soft" },
  event: { label: "Event", icon: "Party", tone: "gold" },
};

export const reminderOptions = [
  { label: "없음", value: null },
  { label: "5분 전", value: 5 },
  { label: "10분 전", value: 10 },
  { label: "30분 전", value: 30 },
  { label: "1시간 전", value: 60 },
  { label: "하루 전", value: 1440 },
] as const;
