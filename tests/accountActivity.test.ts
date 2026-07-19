import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migration = readFileSync(new URL('../supabase/migrations/202607190009_account_activity_notifications.sql', import.meta.url), 'utf8')
const header = readFileSync(new URL('../src/components/AppHeader.tsx', import.meta.url), 'utf8')
const throne = readFileSync(new URL('../src/features/throne/ThronePage.tsx', import.meta.url), 'utf8')
const verification = readFileSync(new URL('../supabase/verify_account_activity.sql', import.meta.url), 'utf8')

test('benefit grants create persistent recipient notifications', () => {
  assert.match(migration, /after insert on public\.admin_benefit_grants/)
  assert.match(migration, /insert into public\.notifications/)
  assert.match(migration, /'benefit_grant'/)
})

test('notification clients can only read and update their own rows', () => {
  assert.match(migration, /create policy notifications_select_own/)
  assert.match(migration, /create policy notifications_update_own/)
  assert.match(migration, /revoke insert, delete on table public\.notifications from anon, authenticated/)
})

test('account activity is exposed only through an authenticated own-user RPC', () => {
  assert.match(migration, /function public\.get_my_ai_activity/)
  assert.match(migration, /v_user_id uuid := auth\.uid\(\)/)
  assert.match(migration, /where user_id = v_user_id/)
  assert.match(migration, /grant execute on function public\.get_my_ai_activity\(integer\) to authenticated/)
})

test('header and throne expose point balance, usage and gifts', () => {
  assert.match(header, /className="header-points"/)
  assert.match(header, /loadAccountNotifications/)
  assert.match(throne, /리타 포인트와 이용 기록/)
  assert.match(throne, /받은 선물/)
})

test('account activity verification covers RPC, grants, trigger and RLS policies', () => {
  assert.match(verification, /내 이용기록 RPC/)
  assert.match(verification, /알림 테이블 권한/)
  assert.match(verification, /선물 알림 트리거/)
  assert.match(verification, /계정별 알림 RLS 정책/)
})
