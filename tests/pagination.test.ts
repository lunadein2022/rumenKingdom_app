import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const pagination = read('../src/components/Pagination.tsx')

test('all accumulating lists share a fixed twenty-item paginator', () => {
  assert.match(pagination, /PAGE_SIZE = 20/)
  assert.match(pagination, /items\.slice\(\(page - 1\) \* pageSize, page \* pageSize\)/)
  assert.match(pagination, /aria-label=\{`\$\{label\} 페이지`\}/)
  for (const path of [
    '../src/features/office/OfficePage.tsx',
    '../src/features/library/LibraryPage.tsx',
    '../src/features/notifications/NotificationsPage.tsx',
    '../src/features/throne/ThronePage.tsx',
    '../src/features/admin/AdminPage.tsx',
    '../src/features/admin/AdminRuntimePanel.tsx',
    '../src/features/releases/PatchNotesPage.tsx',
    '../src/features/calendar/CalendarPage.tsx',
    '../src/features/diary/DiaryPage.tsx',
    '../src/features/plans/PlansPage.tsx',
    '../src/components/AppHeader.tsx',
  ]) assert.match(read(path), /<Pagination /, `${path} should expose pagination`)
})

test('office and royal library reset or preserve page state by tab and category', () => {
  const office = read('../src/features/office/OfficePage.tsx')
  const library = read('../src/features/library/LibraryPage.tsx')
  assert.match(office, /usePaginatedList\(visibleQuests, `\$\{filter\}:\$\{query\}`\)/)
  assert.match(office, /usePaginatedList\(activeProjects, 'office-projects'\)/)
  assert.match(library, /const pageSize = PAGE_SIZE/)
  assert.match(library, /params\.get\('page'\)/)
  assert.doesNotMatch(library, /10개씩|12개씩|50개씩/)
})

test('shared patch history exposes five twenty-item pages', () => {
  const migration = read('../supabase/migrations/202607200014_pagination_limits.sql')
  const adminRuntime = read('../netlify/functions/admin-runtime.js')
  assert.match(migration, /order by published_at desc limit 100/)
  assert.match(migration, /grant execute on function public\.get_public_app_bootstrap\(text\) to anon, authenticated, service_role/)
  assert.equal((adminRuntime.match(/\.limit\(100\)/g) ?? []).length, 3)
})
