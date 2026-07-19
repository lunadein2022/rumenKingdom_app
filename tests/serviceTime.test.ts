import test from 'node:test'
import assert from 'node:assert/strict'
import { configureServiceTime, currentServiceTimePreferences, resetServiceTime, serviceDate } from '../src/lib/serviceTime.ts'

test('서비스일은 선택한 시간대와 하루 시작 시각을 따른다', () => {
  assert.equal(serviceDate(new Date('2026-07-19T20:59:00Z'), 'Asia/Seoul', '06:00'), '2026-07-19')
  assert.equal(serviceDate(new Date('2026-07-19T21:00:00Z'), 'Asia/Seoul', '06:00'), '2026-07-20')
  assert.equal(serviceDate(new Date('2026-07-20T05:29:00Z'), 'UTC', '05:30'), '2026-07-19')
  assert.equal(serviceDate(new Date('2026-07-20T05:30:00Z'), 'UTC', '05:30'), '2026-07-20')
})

test('계정 설정을 런타임 기본값으로 적용하고 초기화한다', () => {
  configureServiceTime('UTC', '03:15')
  assert.deepEqual(currentServiceTimePreferences(), { timeZone: 'UTC', serviceDayStartsAt: '03:15' })
  resetServiceTime()
  assert.deepEqual(currentServiceTimePreferences(), { timeZone: 'Asia/Seoul', serviceDayStartsAt: '06:00' })
})
