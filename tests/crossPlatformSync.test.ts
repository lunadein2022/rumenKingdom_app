import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migration = readFileSync(new URL('../supabase/migrations/202607190012_cross_platform_sync.sql', import.meta.url), 'utf8')
const engine = readFileSync(new URL('../src/lib/syncEngine.ts', import.meta.url), 'utf8')
const deleteAccount = readFileSync(new URL('../netlify/functions/delete-account.js', import.meta.url), 'utf8')
const cleanup = readFileSync(new URL('../netlify/functions/storage-cleanup.js', import.meta.url), 'utf8')
const netlify = readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8')

test('cross-platform mutations are revision checked and idempotent', () => {
  assert.match(migration, /create table if not exists public\.sync_mutation_receipts/)
  assert.match(migration, /create or replace function public\.apply_sync_mutation/)
  assert.match(migration, /t\.revision = \$4/)
  assert.match(migration, /'status', case when server_record is null then 'not_found' else 'conflict' end/)
  assert.match(migration, /primary key \(user_id, device_id, mutation_id\)/)
})

test('change feed and web outbox support reconnect synchronization', () => {
  assert.match(migration, /create table if not exists public\.sync_change_log/)
  assert.match(migration, /create or replace function public\.get_sync_changes/)
  assert.match(engine, /rumen-sync-outbox-v1/)
  assert.match(engine, /window\.addEventListener\('online'/)
  assert.match(engine, /setInterval\(\(\) => void cycle\(\), 30_000\)/)
  assert.match(engine, /announce\('conflict'/)
})

test('account deletion removes private storage before deleting auth user', () => {
  assert.match(deleteAccount, /auth\.getUser\(token\)/)
  assert.match(deleteAccount, /DELETE MY ACCOUNT/)
  assert.match(deleteAccount, /removeUserStorage\(admin, 'rita-attachments'/)
  assert.match(deleteAccount, /removeUserStorage\(admin, 'room-backgrounds'/)
  assert.match(deleteAccount, /listStorageFiles\(client, bucket, path\)/)
  assert.match(deleteAccount, /auth\.admin\.deleteUser/)
})

test('orphaned storage and verified store ownership are server controlled', () => {
  assert.match(migration, /create table if not exists public\.storage_cleanup_queue/)
  assert.match(migration, /create table if not exists public\.store_transactions/)
  assert.match(migration, /create table if not exists public\.user_subscriptions/)
  assert.match(migration, /record_verified_store_transaction/)
  assert.match(migration, /old_path not like \(old\.user_id::text \|\| '\/%'\)/)
  assert.match(migration, /revoke all on function public\.record_verified_store_transaction[\s\S]+authenticated/)
  assert.match(cleanup, /SUPABASE_SERVICE_ROLE_KEY/)
  assert.match(netlify, /\[functions\."storage-cleanup"\][\s\S]+schedule = "@hourly"/)
})
