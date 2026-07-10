import { getKoreanToday } from "../../../app/dateUtils";
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

function hasDateSignal(message: string) {
  return (
    /(오늘|내일|모레|이번\s*주|다음\s*주|이번\s*달|다음\s*달)/.test(message) ||
    /(\d{1,2})\s*월\s*(\d{1,2})\s*일/.test(message) ||
    /[일월화수목금토]요일/.test(message)
  );
}

function hasTimeSignal(message: string) {
  return /(\d{1,2})\s*(시|:)\s*(\d{1,2})?/.test(message) || /(오전|오후|저녁|밤|아침|점심)/.test(message);
}

function isQuestionOnly(message: string) {
  return /(뭐\s*있|뭐야|알려줘|확인해줘|있어\??|있나요|있니|어때|괜찮을까|가능할까|일정\s*있)/.test(message);
}

function isRetrospective(message: string) {
  return /(갔었|했었|먹었|봤었|다녀왔|였어|이었다|좋았어|힘들었어|기억나|생각나)/.test(message);
}

function isHesitation(message: string) {
  return /(고민이야|해야\s*하는데|할까\s*말까|어쩌지|모르겠어|해야\s*되나|하면\s*좋을까)/.test(message);
}

function hasExplicitCalendarCommand(message: string) {
  return /(일정|캘린더|예약|약속|회의|미팅).{0,12}(추가|등록|넣어|만들어|잡아|예약)/.test(message) ||
    /(추가|등록|넣어|만들어|잡아|예약).{0,12}(일정|캘린더|약속|회의|미팅)/.test(message);
}

function shouldCreateCalendar(message: string) {
  if (isRetrospective(message) || isHesitation(message) || isQuestionOnly(message)) return false;
  if (hasExplicitCalendarCommand(message)) return true;
  if ((hasDateSignal(message) || hasTimeSignal(message)) && /(일정|약속|회의|미팅|예약|방문|전화|가야|만나|출발)/.test(message)) return true;
  return false;
}

function parseDate(message: string, baseDate: string) {
  const base = new Date(`${baseDate}T09:00:00`);

  if (message.includes("모레")) return formatDate(addDays(base, 2));
  if (message.includes("내일")) return formatDate(addDays(base, 1));
  if (message.includes("오늘")) return formatDate(base);

  const weekdayMatch = message.match(/([일월화수목금토])요일/);
  if (weekdayMatch) {
    const targetDay = weekdayOrder.indexOf(weekdayMatch[1]);
    const isNextWeek = message.includes("다음");
    let diff = (targetDay - base.getDay() + 7) % 7;
    if (diff === 0 && !message.includes("이번")) diff = 7;
    if (isNextWeek) diff += 7;
    return formatDate(addDays(base, diff));
  }

  if (message.includes("다음주") || message.includes("다음 주")) return formatDate(addDays(base, 7));
  if (message.includes("이번주") || message.includes("이번 주")) return formatDate(base);
  if (message.includes("다음달") || message.includes("다음 달")) {
    const next = new Date(base);
    next.setMonth(next.getMonth() + 1);
    return formatDate(next);
  }

  const numericMatch = message.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
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
  if (!match) {
    if (message.includes("아침")) return 9;
    if (message.includes("점심")) return 12;
    if (message.includes("저녁")) return 19;
    if (message.includes("밤")) return 21;
    return 9;
  }
  const raw = Number(match[1]);
  if ((message.includes("오후") || message.includes("저녁") || message.includes("밤")) && raw < 12) return raw + 12;
  return raw;
}

function parseDurationDays(message: string): number | null {
  const nightsMatch = message.match(/(\d{1,2})\s*박\s*(\d{1,2})\s*일/);
  if (nightsMatch) return Number(nightsMatch[2]);

  const durationMatch = message.match(/(\d{1,2})\s*일\s*(동안|간)|(\d{1,2})\s*일\s*내내/);
  if (durationMatch) {
    const value = durationMatch[1] ?? durationMatch[3];
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
    .replace(/\d{1,2}\s*일\s*(동안|간|내내)/g, "")
    .replace(/오늘|내일|모레|이번\s*주|다음\s*주|이번\s*달|다음\s*달|오전|오후|저녁|밤|아침|점심/g, "")
    .replace(/\d{1,2}\s*월\s*\d{1,2}\s*일|\d{1,2}\s*시|[일월화수목금토]요일/g, "")
    .replace(/부터|까지/g, "")
    .replace(/추가해줘|등록해줘|넣어줘|넣어|만들어줘|잡아줘|예약해줘|일정|캘린더|약속/g, "")
    .replace(/\s+/g, " ")
    .trim() || "새 일정";
}

export function parseCalendarIntent(message: string, baseDate = getKoreanToday()): CalendarIntentDraft | null {
  if (!shouldCreateCalendar(message)) return null;

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
      confirmSummary: `${title}을 ${date}부터 ${formatDate(endDateObj)}까지 종일 일정으로 등록`,
    };
  }

  const hour = parseHour(message);
  const startAt = `${date}T${String(hour).padStart(2, "0")}:00:00`;
  const endAt = `${date}T${String(Math.min(hour + 1, 23)).padStart(2, "0")}:00:00`;

  return {
    title,
    startAt,
    endAt,
    isAllDay: !hasTimeSignal(message),
    isMultiDay: false,
    category: inferCategory(message),
    confidence: hasExplicitCalendarCommand(message) ? 0.88 : 0.72,
    needsConfirmation: true,
    sourceMessage: message,
    confirmSummary: `${title}을 ${date}${hasTimeSignal(message) ? ` ${String(hour).padStart(2, "0")}:00` : ""} 일정으로 등록`,
  };
}
