import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migration = readFileSync(new URL('../supabase/migrations/202607190013_common_update_system.sql', import.meta.url), 'utf8')
const verify = readFileSync(new URL('../supabase/verify_common_update_system.sql', import.meta.url), 'utf8')
const runtime = readFileSync(new URL('../src/services/runtimeConfigService.ts', import.meta.url), 'utf8')
const provider = readFileSync(new URL('../src/features/runtime/RuntimeConfig.tsx', import.meta.url), 'utf8')
const admin = readFileSync(new URL('../netlify/functions/admin-runtime.js', import.meta.url), 'utf8')
const plans = readFileSync(new URL('../src/features/plans/PlansPage.tsx', import.meta.url), 'utf8')
const releases = readFileSync(new URL('../src/features/releases/PatchNotesPage.tsx', import.meta.url), 'utf8')
const rita = readFileSync(new URL('../src/features/rita/RitaPage.tsx', import.meta.url), 'utf8')

test('bootstrap exposes version, maintenance, flags, policy, catalog and releases read-only', () => {
  assert.match(migration, /create table if not exists public\.app_runtime_config/)
  assert.match(migration, /create table if not exists public\.app_announcements/)
  assert.match(migration, /create table if not exists public\.app_catalog_items/)
  assert.match(migration, /create or replace function public\.get_public_app_bootstrap/)
  assert.match(migration, /grant execute on function public\.get_public_app_bootstrap\(text\) to anon, authenticated/)
  assert.match(verify, /동적 AI 정책/)
})

test('runtime config supports cache, feature gates, maintenance and force update', () => {
  assert.match(runtime, /rumen-app-bootstrap-v1/)
  assert.match(runtime, /normalizeBootstrap\(JSON\.parse\(cached\), 'cache'\)/)
  assert.match(provider, /featureEnabled/)
  assert.match(provider, /config\.maintenance\.blocking/)
  assert.match(provider, /compareVersions\(currentAppVersion\(\), minimum\)/)
})

test('admin changes are server authenticated, validated and audited', () => {
  assert.match(admin, /authClient\.auth\.getUser\(token\)/)
  assert.match(admin, /admin_get_context/)
  assert.match(admin, /app_config_audit_log/)
  assert.match(admin, /\['owner', 'admin'\]\.includes\(context\.role\)/)
  assert.doesNotMatch(admin, /SUPABASE_SERVICE_ROLE_KEY[^\n]+return/)
})

test('reference web client exposes plans, trial, patch history and estimated AI points', () => {
  assert.match(plans, /trialDays/)
  assert.match(plans, /monthlyPriceKrw/)
  assert.match(releases, /config\.apiVersion/)
  assert.match(rita, /expectedPoints/)
  assert.match(rita, /남은 포인트/)
})
