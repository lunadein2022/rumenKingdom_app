import type { CalendarCategory, CalendarIntentDraft } from "../types/calendar.types";

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(message: string, baseDate: string) {
  const base = new Date(`${baseDate}T09:00:00`);
  const dateMatch = message.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (dateMatch) {
    const year = base.getFullYear();
    return `${year}-${dateMatch[1].padStart(2, "0")}-${dateMatch[2].padStart(2, "0")}`;
  }
  if (message.includes("내일")) return formatDate(addDays(base, 1));
  if (message.includes("모레")) return formatDate(addDays(base, 2));
  if (message.includes("오늘")) return formatDate(base);
  return formatDate(base);
}

function parseHour(message: string) {
  const match = message.match(/(\d{1,2})\s*시/);
  if (!match) return 9;
  const raw = Number(match[1]);
  if ((message.includes("오후") || message.includes("저녁")) && raw < 12) return raw + 12;
  return Math.max(0, Math.min(raw, 23));
}

function inferCategory(message: string): CalendarCategory {
  if (message.includes("회의") || message.includes("미팅")) return "meeting";
  if (message.includes("퀘스트") || message.includes("준비")) return "quest";
  if (message.includes("운동") || message.includes("반복")) return "routine";
  if (message.includes("휴식") || message.includes("쉬기")) return "rest";
  if (message.includes("세린")) return "serin";
  if (message.includes("축제") || message.includes("이벤트")) return "event";
  if (message.includes("업무") || message.includes("회사")) return "work";
  return "personal";
}

function cleanTitle(message: string) {
  return message
    .replace(/오늘|내일|모레|오전|오후|저녁|\d{1,2}\s*시|일정|캘린더|예약|등록|추가|해줘|넣어줘|잡아줘/g, "")
    .replace(/\s+/g, " ")
    .trim() || "새 일정";
}

export function parseCalendarIntent(message: string, baseDate = "2026-07-09"): CalendarIntentDraft | null {
  const hasCalendarIntent = /(일정|캘린더|예약|회의|미팅|약속|등록|추가|잡아줘|넣어줘)/.test(message);
  if (!hasCalendarIntent) return null;

  const date = parseDate(message, baseDate);
  const hour = parseHour(message);
  const startAt = `${date}T${String(hour).padStart(2, "0")}:00:00`;
  const endAt = `${date}T${String(Math.min(hour + 1, 23)).padStart(2, "0")}:00:00`;

  return {
    title: cleanTitle(message),
    startAt,
    endAt,
    category: inferCategory(message),
    confidence: 0.86,
    needsConfirmation: false,
    sourceMessage: message,
  };
}
