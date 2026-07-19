import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migration = readFileSync(new URL('../supabase/migrations/202607190011_shared_app_releases.sql', import.meta.url), 'utf8')
const service = readFileSync(new URL('../src/services/releaseNotesService.ts', import.meta.url), 'utf8')
const modal = readFileSync(new URL('../src/components/PatchNotesModal.tsx', import.meta.url), 'utf8')

test('shared releases are readable by clients but writable only by the server', () => {
  assert.match(migration, /alter table public\.app_releases enable row level security/)
  assert.match(migration, /grant select on table public\.app_releases to anon, authenticated/)
  assert.match(migration, /grant select, insert, update, delete on table public\.app_releases to service_role/)
  assert.doesNotMatch(migration, /grant (?:insert|update|delete)[^\n]+to (?:anon|authenticated)/)
})

test('web patch notes use the shared cross-platform release source with a bundled fallback', () => {
  assert.match(service, /\.from\('app_releases'\)/)
  assert.match(service, /\.contains\('platforms', \[platform\]\)/)
  assert.match(service, /return latestPatchNote/)
  assert.match(modal, /loadLatestPatchNote\('web'\)/)
})
