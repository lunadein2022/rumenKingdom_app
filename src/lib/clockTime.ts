/** Normalizes Postgres `time` values such as 09:30:00 to the app contract HH:mm. */
export function hourMinute(value: string | null | undefined): string | undefined {
  const match = /^(\d{2}):(\d{2})/.exec(String(value ?? ''))
  return match ? `${match[1]}:${match[2]}` : undefined
}
