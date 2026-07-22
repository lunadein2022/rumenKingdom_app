import test from 'node:test'
import assert from 'node:assert/strict'
import { buildRecurrenceRule, eventOccurrenceOn, parseRecurrenceRule, questOccursOn, recurrenceLabel } from '../src/lib/recurrence.ts'
import type { CalendarEvent, Quest } from '../src/types.ts'

const event = (recurrenceRule: string): CalendarEvent => ({
  id: 'event-1', title: '반복 일정', date: '2026-07-01', start: '09:00', kind: 'royal', recurrenceRule,
})

test('weekly recurrence stores and evaluates multiple weekdays', () => {
  const rule = buildRecurrenceRule('WEEKLY', undefined, { byDay: ['MO', 'WE', 'FR'] }) as string
  assert.deepEqual(parseRecurrenceRule(rule).byDay, ['MO', 'WE', 'FR'])
  assert.ok(eventOccurrenceOn(event(rule), '2026-07-06'))
  assert.equal(eventOccurrenceOn(event(rule), '2026-07-07'), null)
  assert.equal(recurrenceLabel(rule), '매주 월·수·금')
})

test('monthly recurrence uses ordinal weekday and yearly recurrence uses month and day', () => {
  const secondTuesday = buildRecurrenceRule('MONTHLY', undefined, { byDay: ['TU'], bySetPos: 2 }) as string
  const lastFriday = buildRecurrenceRule('MONTHLY', undefined, { byDay: ['FR'], bySetPos: -1 }) as string
  const yearly = buildRecurrenceRule('YEARLY', undefined, { byMonth: 7, byMonthDay: 22 }) as string
  assert.ok(eventOccurrenceOn(event(secondTuesday), '2026-07-14'))
  assert.ok(eventOccurrenceOn(event(lastFriday), '2026-07-31'))
  assert.equal(eventOccurrenceOn(event(lastFriday), '2026-07-24'), null)
  assert.ok(eventOccurrenceOn(event(yearly), '2027-07-22'))
  assert.equal(eventOccurrenceOn(event(yearly), '2027-07-23'), null)
})

test('daily quest remains due every day through its deadline', () => {
  const quest: Quest = {
    id: 'quest-1', title: '7월 28일까지 매일', description: '', memo: '', tags: [], type: 'daily', status: 'active',
    due: '2026-07-28', scheduledDate: '2026-07-28', done: false, priority: 'medium', favorite: false,
    createdAt: '2026-07-22T01:00:00.000Z', updatedAt: '2026-07-22T01:00:00.000Z',
  }
  assert.equal(questOccursOn(quest, '2026-07-21', '2026-07-22'), false)
  assert.equal(questOccursOn(quest, '2026-07-22', '2026-07-22'), true)
  assert.equal(questOccursOn(quest, '2026-07-27', '2026-07-22'), true)
  assert.equal(questOccursOn(quest, '2026-07-28', '2026-07-22'), true)
  assert.equal(questOccursOn(quest, '2026-07-29', '2026-07-22'), false)
})
