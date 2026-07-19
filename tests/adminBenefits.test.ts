import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migration = readFileSync(new URL('../supabase/migrations/202607190008_admin_benefits.sql', import.meta.url), 'utf8')
const handler = readFileSync(new URL('../netlify/functions/admin-benefits.js', import.meta.url), 'utf8')
const verification = readFileSync(new URL('../supabase/verify_admin_benefits.sql', import.meta.url), 'utf8')

test('owner provisioning grants complimentary access without hardcoding a personal email', () => {
  assert.match(migration, /function public\.provision_internal_account/)
  assert.match(migration, /values \(new\.id, 'royal_ai', 10000\)/)
  assert.match(migration, /entitlement_key = 'all_access'/)
  assert.match(migration, /new\.email_confirmed_at is not null/)
  assert.doesNotMatch(migration, /values \('[^']+@[^']+', 'owner'/)
  assert.match(migration, /revoke all on function public\.provision_internal_account\(text, text, boolean\) from public, anon, authenticated, service_role/)
})

test('admin verification checks RLS, RPC grants and owner benefits', () => {
  assert.match(verification, /관리자 테이블 RLS/)
  assert.match(verification, /관리자 RPC 권한/)
  assert.match(verification, /소유자 계정/)
  assert.match(verification, /ai\.signup_bonus_remaining >= 10000/)
})

test('admin benefit tables deny direct client access', () => {
  assert.match(migration, /alter table public\.app_admins enable row level security/)
  assert.match(migration, /revoke all on table public\.admin_benefit_grants from public, anon, authenticated/)
  assert.match(migration, /grant execute on function public\.admin_grant_benefit\([^)]+\) to service_role/)
  assert.doesNotMatch(migration, /grant execute on function public\.admin_grant_benefit\([^)]+\) to authenticated/)
})

test('admin API authenticates the user and uses privileged RPCs only on the server', () => {
  assert.match(handler, /authClient\.auth\.getUser\(token\)/)
  assert.match(handler, /createClient\(supabaseUrl, serviceRoleKey/)
  assert.match(handler, /serviceClient\.rpc\('admin_grant_benefit'/)
  assert.match(handler, /idempotencyKey/)
})
