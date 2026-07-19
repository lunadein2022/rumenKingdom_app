import { useEffect, useState } from 'react'
import { millisecondsUntilNextServiceDay, serviceDate } from './serviceTime'

export function useServiceDate() {
  const [date, setDate] = useState(() => serviceDate())

  useEffect(() => {
    let timer = 0
    const schedule = () => {
      window.clearTimeout(timer)
      setDate(serviceDate())
      timer = window.setTimeout(() => {
        setDate(serviceDate())
        schedule()
      }, millisecondsUntilNextServiceDay())
    }
    schedule()
    window.addEventListener('rumen-service-time-updated', schedule)
    return () => { window.clearTimeout(timer); window.removeEventListener('rumen-service-time-updated', schedule) }
  }, [])

  return date
}
