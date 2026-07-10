import type { CalendarEvent } from "../app/types";

// 초기 Mock 데이터는 예시 일정 1개로 최소화해, 나중에 실제로 등록한 일정과
// 처음부터 섞여 보이지 않게 합니다.
// TODO:
// Replace with Supabase Query from calendar_events.
export const mockCalendarEvents: CalendarEvent[] = [
  {
    id: "e-001",
    title: "대표님 미팅",
    description: "진행 상황을 대표님께 보고합니다.",
    startAt: "2026-07-09T15:00:00",
    endAt: "2026-07-09T15:30:00",
    location: "집무실",
    category: "meeting",
    priority: "high",
    isAllDay: false,
    reminderMinutes: 10,
    reminderSentAt: null,
    linkedQuestId: null,
    status: "scheduled",
    createdBy: "user",
  },
];
