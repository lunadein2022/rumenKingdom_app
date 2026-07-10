import type { CalendarEvent } from "../app/types";

// 초기 상태는 완전히 비어 있습니다. 일정은 사용자가 등록한 것만 존재합니다.
// TODO: Replace with Supabase Query from calendar_events.
export const mockCalendarEvents: CalendarEvent[] = [];
