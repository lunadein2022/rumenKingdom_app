import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const context = read('../src/features/notifications/notificationContext.ts')
const center = read('../src/features/notifications/NotificationCenter.tsx')
const modal = read('../src/components/AnnouncementModal.tsx')
const router = read('../src/app/AppRouter.tsx')
const css = read('../src/runtime.css')

test('published announcements flow into the shared notification list', () => {
  assert.match(context, /severity\?: 'info' \| 'warning' \| 'critical'/)
  assert.match(center, /useRuntimeConfig/)
  assert.match(center, /const \{ announcements \} = useRuntimeConfig\(\)/)
  assert.match(center, /`announcement:\$\{item\.id\}`/)
  assert.match(center, /read: readLocalIds\.includes\(id\)/)
  assert.match(center, /\[announcements, events, memos, quests, readLocalIds, remoteNotifications, serviceToday\]/)
})

test('an unread announcement automatically opens a popup and dismissing marks it read', () => {
  assert.match(modal, /item\.id\.startsWith\('announcement:'\) && !item\.read/)
  assert.match(modal, /const close = \(\) => markRead\(next\)/)
  assert.match(modal, /if \(!notificationsEnabled\) return null/)
})

test('the announcement popup is mounted for every authenticated route', () => {
  assert.match(router, /import \{ AnnouncementModal \} from '..\/components\/AnnouncementModal'/)
  assert.match(router, /<PatchNotesModal\/><AnnouncementModal\/>/)
  assert.match(css, /\.announcement-modal\{/)
})
