import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const header = readFileSync(new URL('../src/components/AppHeader.tsx', import.meta.url), 'utf8')
const center = readFileSync(new URL('../src/features/notifications/NotificationCenter.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')

test('the header keeps a visible account unread-count badge until notifications are read', () => {
  assert.match(center, /const unreadCount = notificationsEnabled \? notifications\.filter\(\(item\) => !item\.read\)\.length : 0/)
  assert.match(header, /className="notification-badge"/)
  assert.match(header, /unreadCount > 99 \? '99\+' : unreadCount/)
  assert.match(center, /markAccountNotificationRead\(item\.remoteId\)/)
  assert.match(center, /markAccountNotificationsRead\(remoteIds\)/)
  assert.match(styles, /\.notification-badge\{[^}]+background:#c95d6d/)
})
