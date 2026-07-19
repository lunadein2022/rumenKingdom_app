// Time helpers anchored to the active account's kingdom preferences.
const DEFAULT_TIME_ZONE = 'Asia/Seoul'
const DEFAULT_STARTS_AT = '06:00'
let activeTimeZone = DEFAULT_TIME_ZONE
let activeStartsAt = DEFAULT_STARTS_AT

function validTimeZone(value: string) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: value }).format(); return true } catch { return false }
}

function normalizeStartsAt(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : DEFAULT_STARTS_AT
}

export function configureServiceTime(timeZone = DEFAULT_TIME_ZONE, startsAt = DEFAULT_STARTS_AT) {
  activeTimeZone = validTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE
  activeStartsAt = normalizeStartsAt(startsAt)
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('rumen-service-time-updated'))
}

export function currentServiceTimePreferences() {
  return { timeZone: activeTimeZone, serviceDayStartsAt: activeStartsAt }
}

export function resetServiceTime() {
  configureServiceTime(DEFAULT_TIME_ZONE, DEFAULT_STARTS_AT)
}

function startsAtParts(value: string | number) {
  if (typeof value === 'number') return { hour: Math.max(0, Math.min(23, value)), minute: 0 }
  const [hour, minute] = normalizeStartsAt(value).split(':').map(Number)
  return { hour, minute }
}

function zonedParts(now: Date, timeZone = activeTimeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0)
  return { year: read('year'), month: read('month'), day: read('day'), hour: read('hour'), minute: read('minute'), second: read('second') }
}

/** Kingdom service date. A new day starts at 06:00 in the selected timezone. */
export function serviceDate(now: Date = new Date(), timeZone = activeTimeZone, startsAt: string | number = activeStartsAt): string {
  const value = zonedParts(now, timeZone)
  const boundary = startsAtParts(startsAt)
  const localDate = new Date(Date.UTC(value.year, value.month - 1, value.day))
  if (value.hour * 60 + value.minute < boundary.hour * 60 + boundary.minute) localDate.setUTCDate(localDate.getUTCDate() - 1)
  return localDate.toISOString().slice(0, 10)
}

/** Milliseconds until the next service-day boundary; useful for a rollover timer. */
export function millisecondsUntilNextServiceDay(now: Date = new Date(), timeZone = activeTimeZone, startsAt: string | number = activeStartsAt): number {
  const value = zonedParts(now, timeZone)
  const starts = startsAtParts(startsAt)
  const localNow = Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, value.second)
  const boundary = new Date(Date.UTC(value.year, value.month - 1, value.day, starts.hour, starts.minute))
  if (value.hour * 60 + value.minute >= starts.hour * 60 + starts.minute) boundary.setUTCDate(boundary.getUTCDate() + 1)
  return Math.max(1000, boundary.getTime() - localNow + 250)
}

/** Current hour (0-23) in the active account's selected timezone. */
export function seoulHour(now: Date = new Date()): number {
  const value = new Intl.DateTimeFormat('en-US', {
    timeZone: activeTimeZone,
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
