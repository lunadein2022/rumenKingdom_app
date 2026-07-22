import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export const config = { schedule: '* * * * *' }

export async function handler() {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY
  const subject = process.env.WEB_PUSH_SUBJECT || 'mailto:admin@rumenkingdom.app'
  if (!url || !serviceKey || !publicKey || !privateKey) return response(503, { error: 'push_not_configured' })
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  webpush.setVapidDetails(subject, publicKey, privateKey)
  const { data, error } = await admin.rpc('claim_push_deliveries', { p_limit: 100 })
  if (error) return response(500, { error: 'claim_failed' })
  const jobs = Array.isArray(data) ? data : []
  let delivered = 0
  for (let offset = 0; offset < jobs.length; offset += 10) {
    const results = await Promise.all(jobs.slice(offset, offset + 10).map((job) => deliver(admin, job)))
    delivered += results.filter(Boolean).length
  }
  return response(200, { claimed: jobs.length, delivered })
}

async function deliver(admin, job) {
  try {
    await webpush.sendNotification({ endpoint: job.endpoint, keys: { p256dh: job.p256dh, auth: job.auth } }, JSON.stringify({
      title: job.title, body: job.body, path: job.path, tag: `notification:${job.notificationId}`,
    }), { TTL: 24 * 60 * 60, urgency: 'normal' })
    await admin.from('push_deliveries').update({ status: 'delivered', delivered_at: new Date().toISOString(), last_error: null })
      .eq('notification_id', job.notificationId).eq('subscription_id', job.subscriptionId)
    return true
  } catch (reason) {
    const statusCode = Number(reason?.statusCode)
    const terminal = statusCode === 404 || statusCode === 410 || Number(job.attempts) >= 5
    const message = String(reason?.message ?? 'push_failed').slice(0, 500)
    await admin.from('push_deliveries').update({ status: terminal ? 'failed' : 'pending', last_error: message })
      .eq('notification_id', job.notificationId).eq('subscription_id', job.subscriptionId)
    if (statusCode === 404 || statusCode === 410) await admin.from('push_subscriptions').update({ enabled: false }).eq('id', job.subscriptionId)
    if (terminal) {
      try { await admin.from('operational_events').insert({ source: 'push-dispatch', severity: 'warning', code: 'web_push_failed', message, metadata: { statusCode, attempts: job.attempts } }) } catch { /* best-effort telemetry */ }
    }
    return false
  }
}

function response(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) }
}
