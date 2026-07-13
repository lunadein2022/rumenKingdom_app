// Time helpers anchored to the kingdom's timezone (Asia/Seoul).
const SEOUL_TIME_ZONE = 'Asia/Seoul'

function zonedParts(now: Date, timeZone = SEOUL_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0)
  return { year: read('year'), month: read('month'), day: read('day'), hour: read('hour'), minute: read('minute'), second: read('second') }
}

/** Kingdom service date. A new day starts at 06:00 in the selected timezone. */
export function serviceDate(now: Date = new Date(), timeZone = SEOUL_TIME_ZONE, startsAtHour = 6): string {
  const value = zonedParts(now, timeZone)
  const localDate = new Date(Date.UTC(value.year, value.month - 1, value.day))
  if (value.hour < startsAtHour) localDate.setUTCDate(localDate.getUTCDate() - 1)
  return localDate.toISOString().slice(0, 10)
}

/** Milliseconds until the next service-day boundary; useful for a rollover timer. */
export function millisecondsUntilNextServiceDay(now: Date = new Date(), timeZone = SEOUL_TIME_ZONE, startsAtHour = 6): number {
  const value = zonedParts(now, timeZone)
  const localNow = Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, value.second)
  const boundary = new Date(Date.UTC(value.year, value.month - 1, value.day, startsAtHour))
  if (value.hour >= startsAtHour) boundary.setUTCDate(boundary.getUTCDate() + 1)
  return Math.max(1000, boundary.getTime() - localNow + 250)
}

/** Current hour (0-23) in Asia/Seoul, regardless of the browser's timezone. */
export function seoulHour(now: Date = new Date()): number {
  const value = new Intl.DateTimeFormat('en-US', {
    timeZone: SEOUL_TIME_ZONE,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(now)
  return Number(value)
}

/**
 * Lobby greeting lead line, chosen by time of day (Asia/Seoul).
 * 06:00–11:59 아침 · 12:00–17:59 오후 · 18:00–05:59 저녁/밤.
 * "공주님." is rendered on the following line, so this returns only the lead.
 */
export function lobbyGreetingLead(now: Date = new Date()): string {
  const hour = seoulHour(now)
  if (hour >= 6 && hour < 12) return '좋은 아침입니다,'
  if (hour >= 12 && hour < 18) return '좋은 오후입니다,'
  return '좋은 하루 보내셨나요?'
}
