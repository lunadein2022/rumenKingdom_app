// 앱의 모든 "오늘"은 이 파일만 바라봅니다. 하드코딩된 날짜 상수를 두지 않고,
// 한국(Asia/Seoul) 기준 현재 날짜를 항상 여기서 계산합니다.

const SEOUL = "Asia/Seoul";

/** 한국 기준 오늘 날짜를 "YYYY-MM-DD"로 반환합니다. */
export function getKoreanToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** "YYYY-MM-DD"에 days일을 더한 "YYYY-MM-DD"를 반환합니다. */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** "2026년 7월 10일 금요일" 형태의 표기. 홈 브리핑 등 본문용입니다. */
export function formatKoreanDateLong(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00+09:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: SEOUL,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

/** "2026.07.10 (금)" 형태의 표기. 상단 HUD용입니다. */
export function formatHudDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00+09:00`);
  const weekday = new Intl.DateTimeFormat("ko-KR", { timeZone: SEOUL, weekday: "short" }).format(date);
  return `${dateStr.split("-").join(".")} (${weekday})`;
}

/** "7월 10일" 형태의 짧은 표기. 목록/상세용입니다. */
export function formatKoreanDateShort(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00+09:00`);
  return new Intl.DateTimeFormat("ko-KR", { timeZone: SEOUL, month: "long", day: "numeric" }).format(date);
}

/** 한국 기준 현재 시각 "14:35" 표기. 상단 HUD 시계용입니다. */
export function getKoreanTimeNow(): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: SEOUL,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}
