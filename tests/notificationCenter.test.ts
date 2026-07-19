import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const header = readFileSync(new URL('../src/components/AppHeader.tsx', import.meta.url), 'utf8')
const center = readFileSync(new URL('../src/features/notifications/NotificationCenter.tsx', import.meta.url), 'utf8')
const page = readFileSync(new URL('../src/features/notifications/NotificationsPage.tsx', import.meta.url), 'utf8')
const router = readFileSync(new URL('../src/app/AppRouter.tsx', import.meta.url), 'utf8')

test('header shows at most five compact one-line notifications', () => {
  assert.match(header, /notificationItems\.slice\(0, 5\)/)
  assert.match(header, /className="notification-line"/)
  assert.match(header, /navigate\('\/notifications'\)/)
})

test('notification center shares account read state between header and full page', () => {
  assert.match(center, /NotificationCenterProvider/)
  assert.match(center, /markAccountNotificationRead\(item\.remoteId\)/)
  assert.match(center, /markAccountNotificationsRead\(remoteIds\)/)
  assert.match(router, /path="notifications" element=\{<NotificationsPage\/>\}/)
  assert.match(page, /filter === 'unread'/)
  assert.match(page, /markRead\(item\); navigate\(item\.path\)/)
})
