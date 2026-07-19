import test from 'node:test'
import assert from 'node:assert/strict'
import { hourMinute } from '../src/lib/clockTime.ts'

test('calendar time values always use hour and minute only', () => {
  assert.equal(hourMinute('09:30:00'), '09:30')
  assert.equal(hourMinute('23:59:59.999999'), '23:59')
  assert.equal(hourMinute('08:05'), '08:05')
  assert.equal(hourMinute(null), undefined)
})
