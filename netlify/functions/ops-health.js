import { createClient } from '@supabase/supabase-js'

export const config = { schedule: '*/15 * * * *' }

export async function handler() {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return json(503, { status: 'unconfigured' })
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const [webPush, nativePush, cleanup, aiFailures] = await Promise.all([
    count(admin.from('push_deliveries').select('*', { count: 'exact', head: true }).in('status', ['pending', 'processing'])),
    count(admin.from('native_push_deliveries').select('*', { count: 'exact', head: true }).in('status', ['pending', 'processing'])),
    count(admin.from('storage_cleanup_queue').select('*', { count: 'exact', head: true }).is('processed_at', null).gte('attempts', 3)),
    count(admin.from('ai_usage_ledger').select('*', { count: 'exact', head: true }).eq('status', 'released').gte('created_at', since)),
  ])
  const metrics = { staleWebPush: webPush, staleNativePush: nativePush, cleanupRetries: cleanup, aiReleasesLastHour: aiFailures }
  const unhealthy = webPush > 20 || nativePush > 20 || cleanup > 10 || aiFailures > 30
  if (unhealthy) {
    try { await admin.from('operational_events').insert({ source: 'ops-health', severity: 'error', code: 'health_threshold_exceeded', message: '운영 지표가 경고 기준을 초과했습니다.', metadata: metrics }) } catch { /* best effort */ }
  }
  return json(unhealthy ? 503 : 200, { status: unhealthy ? 'degraded' : 'ok', metrics, checkedAt: new Date().toISOString() })
}

async function count(query) { const { count: value, error } = await query; if (error) throw error; return value ?? 0 }
const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) })
