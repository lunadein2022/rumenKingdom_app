import type { CalendarCategory, CalendarIntentDraft } from "../types/calendar.types";

const weekdayOrder = ["일", "월", "화", "수", "목", "금", "토"];

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

  if (message.includes("모레")) return formatDate(addDays(base, 2));
  if (message.includes("내일")) return formatDate(addDays(base, 1));
  if (message.includes("오늘")) return formatDate(base);

  const weekdayMatch = message.match(/([월화수목금토일])요일/);
  if (weekdayMatch) {
    const targetDay = weekdayOrder.indexOf(weekdayMatch[1]);
    const isNextWeek = message.includes("다음");
    let diff = (targetDay - base.getDay() + 7) % 7;
    if (diff === 0 && !message.includes("이번")) diff = 7;
    if (isNextWeek) diff += 7;
    return formatDate(addDays(base, diff));
  }

  if (message.includes("다음주")) return formatDate(addDays(base, 7));
  if (message.includes("이번주")) return formatDate(base);
  if (message.includes("다음달")) {
    const next = new Date(base);
    next.setMonth(next.getMonth() + 1);
    return formatDate(next);
  }

  const numericMatch = message.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (numericMatch) {
    const next = new Date(base);
    next.setMonth(Number(numericMatch[1]) - 1);
    next.setDate(Number(numericMatch[2]));
    return formatDate(next);
  }

  return formatDate(base);
}

function parseHour(message: string) {
  const match = message.match(/(\d{1,2})\s*시/);
  if (!match) return 9;
  const raw = Number(match[1]);
  if ((message.includes("오후") || message.includes("저녁") || message.includes("밤")) && raw < 12) return raw + 12;
  return raw;
}

// "8월 19일부터 3일간", "8월 19일부터 3일 동안", "2박 3일" 같은 기간 표현에서
// "며칠짜리 일정인지"를 뽑아냅니다. "3일간"은 시작일을 포함한 3일이므로,
// 종료일은 시작일 + (일수 - 1)입니다.
function parseDurationDays(message: string): number | null {
  const nightsMatch = message.match(/(\d{1,2})\s*박\s*(\d{1,2})\s*일/);
  if (nightsMatch) return Number(nightsMatch[2]);

  const durationMatch = message.match(/(\d{1,2})\s*일\s*간|(\d{1,2})\s*일\s*동안|(\d{1,2})\s*일\s*내내/);
  if (durationMatch) {
    const value = durationMatch[1] ?? durationMatch[2] ?? durationMatch[3];
    return Number(value);
  }

  return null;
}

function inferCategory(message: string): CalendarCategory {
  if (message.includes("회의") || message.includes("미팅")) return "meeting";
  if (message.includes("여행") || message.includes("휴가")) return "event";
  if (message.includes("퀘스트") || message.includes("준비")) return "quest";
  if (message.includes("운동") || message.includes("반복")) return "routine";
  if (message.includes("쉬") || message.includes("휴식")) return "rest";
  if (message.includes("세린")) return "serin";
  if (message.includes("축제") || message.includes("이벤트")) return "event";
  if (message.includes("업무") || message.includes("회사")) return "work";
  return "personal";
}

function cleanTitle(message: string) {
  return message
    .replace(/\d{1,2}\s*박\s*\d{1,2}\s*일/g, "")
    .replace(/\d{1,2}\s*일\s*간|\d{1,2}\s*일\s*동안|\d{1,2}\s*일\s*내내/g, "")
    .replace(/오늘|내일|모레|다음주|이번주|다음달|오전|오후|저녁|밤|\d{1,2}\s*시|\d{1,2}월\s*\d{1,2}일|[월화수목금토일]요일/g, "")
    .replace(/부터|까지/g, "")
    .replace(/추가해줘|등록해줘|잡아줘|잡아|넣어줘|넣어|만들어줘|올려줘|예약해줘|일정|캘린더|스케줄|약속|에/g, "")
    .replace(/\s+/g, " ")
    .trim() || "새 일정";
}

const calendarTriggerPattern =
  /(일정|캘린더|스케줄|예약|회의|미팅|약속|추가|등록|잡아|넣어|체크인|여행|휴가)/;

export function parseCalendarIntent(message: string, baseDate = "2026-07-09"): CalendarIntentDraft | null {
  // TODO: Replace mock parser with Serin AI intent parser
  const hasCalendarIntent = calendarTriggerPattern.test(message);
  if (!hasCalendarIntent) return null;

  const date = parseDate(message, baseDate);
  const durationDays = parseDurationDays(message);
  const title = cleanTitle(message);

  if (durationDays && durationDays > 1) {
    const startDateObj = new Date(`${date}T00:00:00`);
    const endDateObj = addDays(startDateObj, durationDays - 1);
    const startAt = `${date}T00:00:00`;
    const endAt = `${formatDate(endDateObj)}T23:59:59`;
    return {
      title,
      startAt,
      endAt,
      isAllDay: true,
      isMultiDay: true,
      category: inferCategory(message),
      confidence: 0.84,
      needsConfirmation: true,
      sourceMessage: message,
      confirmSummary: `${title}을(를) ${date}부터 ${formatDate(endDateObj)}까지 종일 일정으로 등록`,
    };
  }

  const hour = parseHour(message);
  const startAt = `${date}T${String(hour).padStart(2, "0")}:00:00`;
  const endAt = `${date}T${String(Math.min(hour + 1, 23)).padStart(2, "0")}:00:00`;

  return {
    title,
    startAt,
    endAt,
    isAllDay: false,
    isMultiDay: false,
    category: inferCategory(message),
    confidence: message.includes("일정") || message.includes("회의") ? 0.86 : 0.68,
    needsConfirmation: true,
    sourceMessage: message,
    confirmSummary: `${title}을(를) ${date} ${String(hour).padStart(2, "0")}:00 일정으로 등록`,
  };
}
