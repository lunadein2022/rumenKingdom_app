// Time helpers anchored to the kingdom's timezone (Asia/Seoul).
const SEOUL_TIME_ZONE = 'Asia/Seoul'

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
