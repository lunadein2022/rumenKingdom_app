import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const header = readFileSync(new URL('../src/components/AppHeader.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')

test('the header keeps a visible account unread-count badge until notifications are read', () => {
  assert.match(header, /const unreadCount = notificationsEnabled \? notificationItems\.filter\(\(item\) => !item\.read\)\.length : 0/)
  assert.match(header, /className="notification-badge"/)
  assert.match(header, /unreadCount > 99 \? '99\+' : unreadCount/)
  assert.match(header, /markAccountNotificationRead\(item\.remoteId\)/)
  assert.match(header, /markAccountNotificationsRead\(remoteIds\)/)
  assert.match(styles, /\.notification-badge\{[^}]+background:#c95d6d/)
})
