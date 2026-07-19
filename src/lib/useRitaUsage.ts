import { useCallback, useEffect, useState } from 'react'
import { getRitaUsage, type RitaUsage } from '../services/ritaService'

export function useRitaUsage(enabled = true) {
  const [usage, setUsage] = useState<RitaUsage | null>(null)
  const refresh = useCallback(async () => {
    if (!enabled) return
    try { setUsage(await getRitaUsage()) } catch { setUsage(null) }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const initial = window.setTimeout(() => void refresh(), 0)
    const interval = window.setInterval(() => void refresh(), 60_000)
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    window.addEventListener('rumen-ai-usage-changed', onFocus)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('rumen-ai-usage-changed', onFocus)
    }
  }, [enabled, refresh])

  return { usage, refresh }
}
