import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('package version and visible patch note stay in sync', () => {
  const pkg = JSON.parse(read('../package.json')) as { version: string }
  const notes = read('../src/lib/patchNotes.ts')
  assert.match(notes, new RegExp(`version: ['"]${pkg.version.replaceAll('.', '\\.')}['"]`))
})

test('release hardening covers reminders, native push, server pages, and monitoring', () => {
  const migration = read('../supabase/migrations/202607220017_release_hardening.sql')
  assert.match(migration, /replace_my_reminders/)
  assert.match(migration, /cancel_my_reminders/)
  assert.match(migration, /native_push_devices/)
  assert.match(migration, /claim_native_push_deliveries/)
  assert.match(migration, /get_my_entity_page/)
  assert.match(read('../src/services/serverPaginationService.ts'), /p_offset: \(safePage - 1\) \* SERVER_PAGE_SIZE/)
  assert.match(migration, /operational_events/)
  assert.match(read('../netlify/functions/native-push-dispatch.js'), /sendApns/)
  assert.match(read('../netlify/functions/native-push-dispatch.js'), /sendFcm/)
  assert.match(migration, /scheduled <= now\(\)/)
  assert.match(read('../src/features/throne/ThronePage.tsx'), /Promise\.allSettled/)
})

test('attachment validation checks signatures, archives, and server-side audio duration', () => {
  const server = read('../netlify/functions/claude.js')
  assert.match(server, /validateAttachmentContent/)
  assert.match(server, /validateArchiveLimits/)
  assert.match(server, /estimateAudioDurationSeconds/)
})
