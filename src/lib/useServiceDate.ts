import { useEffect, useState } from 'react'
import { millisecondsUntilNextServiceDay, serviceDate } from './serviceTime'

export function useServiceDate() {
  const [date, setDate] = useState(() => serviceDate())

  useEffect(() => {
    let timer = 0
    const schedule = () => {
      timer = window.setTimeout(() => {
        setDate(serviceDate())
        schedule()
      }, millisecondsUntilNextServiceDay())
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [])

  return date
}
