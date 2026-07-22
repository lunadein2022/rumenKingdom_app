import { addDays, format, parseISO } from 'date-fns'
import type { Quest } from '../types'
import { questOccursOn } from './recurrence'
import { serviceDate } from './serviceTime'

export function isQuestOnDate(quest: Quest, date: string) {
  if (quest.status === 'archived') return false
  const anchor = serviceDate(new Date(quest.createdAt))
  return questOccursOn(quest, date, anchor) || (!quest.recurrenceRule && quest.due.startsWith('오늘') && date === serviceDate())
}

export function isQuestWithinDays(quest: Quest, startDate: string, numberOfDays: number) {
  const start = parseISO(startDate)
  return Array.from({ length: numberOfDays }, (_, index) => format(addDays(start, index), 'yyyy-MM-dd'))
    .some((date) => isQuestOnDate(quest, date))
}
