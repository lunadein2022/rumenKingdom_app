import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('Rita attachments use private temporary storage and support Korean office formats', () => {
  const client = read('../src/services/ritaService.ts')
  const server = read('../netlify/functions/claude.js')
  const policy = read('../netlify/functions/ai-policy.js')
  assert.match(client, /\/temporary\//)
  assert.match(server, /storage\.from\('rita-attachments'\)\.remove/)
  assert.match(server, /hwpToText/)
  assert.match(server, /HwpxReader/)
  assert.match(policy, /MAX_HWP_BYTES = 20 \* MEBIBYTE/)
  assert.match(policy, /MAX_ATTACHMENT_BYTES = 25 \* MEBIBYTE/)
})

test('pre-billing database hardening adds RLS push subscriptions and server search', () => {
  const migration = read('../supabase/migrations/202607220016_pre_billing_reliability.sql')
  assert.match(migration, /alter table public\.push_subscriptions enable row level security/)
  assert.match(migration, /auth\.uid\(\) = user_id/)
  assert.match(migration, /search_my_kingdom/)
  assert.match(migration, /least\(20/)
  assert.match(migration, /file_size_limit = 26214400/)
})

test('sync conflicts, selective ZIP backup and legal disclosures are reachable', () => {
  assert.match(read('../src/components/SyncConflictDialog.tsx'), /server' \| 'local' \| 'merge' \| 'restore'/)
  assert.match(read('../src/lib/dataExport.ts'), /downloadZip/)
  const router = read('../src/app/AppRouter.tsx')
  assert.match(router, /path="privacy"/)
  assert.match(router, /path="terms"/)
  assert.match(router, /path="ai-data"/)
})

test('optimized princess assets replace large PNG runtime references', () => {
  const catalog = read('../src/lib/princesses.ts')
  assert.doesNotMatch(catalog, /\.png/)
  assert.ok(existsSync(new URL('../public/assets/princesses/full/gentle.webp', import.meta.url)))
  assert.ok(existsSync(new URL('../public/assets/princesses/avatars/lively.webp', import.meta.url)))
})
