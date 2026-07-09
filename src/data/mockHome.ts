import type { CalendarEvent } from "../app/types";

export const mockCalendarEvents: CalendarEvent[] = [
  { id: "e-001", title: "프로젝트 체크인", eventDate: "2026-07-09", roomKey: "office", time: "15:00" },
  { id: "e-002", title: "하루 회고", eventDate: "2026-07-09", roomKey: "bedroom", time: "20:30" },
  { id: "e-003", title: "정원 산책 루틴", eventDate: "2026-07-12", roomKey: "garden", time: "09:30" },
  { id: "e-004", title: "도서관 메모 정리", eventDate: "2026-07-18", roomKey: "library", time: "14:00" },
];
