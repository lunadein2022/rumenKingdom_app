import { createClient } from '@supabase/supabase-js'
import { createSign, sign as cryptoSign } from 'node:crypto'
import http2 from 'node:http2'

export const config = { schedule: '* * * * *' }

export async function handler() {
  try {
    return await dispatch()
  } catch (reason) {
    return response(500, { error: 'native_push_dispatch_failed', detail: String(reason?.message ?? reason).slice(0, 200) })
  }
}

async function dispatch() {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return response(503, { error: 'server_not_configured' })
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.APNS_PRIVATE_KEY) return response(503, { error: 'native_push_not_configured' })
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await admin.rpc('claim_native_push_deliveries', { p_limit: 100 })
  if (error) return response(500, { error: 'claim_failed' })
  const jobs = Array.isArray(data) ? data : []
  let fcmAccess
  if (jobs.some((job) => job.platform === 'android') && process.env.FIREBASE_SERVICE_ACCOUNT_JSON) fcmAccess = await firebaseAccessToken()
  let delivered = 0
  for (let offset = 0; offset < jobs.length; offset += 10) {
    const results = await Promise.all(jobs.slice(offset, offset + 10).map((job) => deliver(admin, job, fcmAccess)))
    delivered += results.filter(Boolean).length
  }
  return response(200, { claimed: jobs.length, delivered })
}

async function deliver(admin, job, fcmAccess) {
  try {
    if (job.platform === 'android') {
      if (!fcmAccess) throw Object.assign(new Error('fcm_not_configured'), { terminal: true })
      await sendFcm(job, fcmAccess)
    } else {
      if (!process.env.APNS_PRIVATE_KEY) throw Object.assign(new Error('apns_not_configured'), { terminal: true })
      await sendApns(job)
    }
    await admin.from('native_push_deliveries').update({ status: 'delivered', delivered_at: new Date().toISOString(), last_error: null })
      .eq('notification_id', job.notificationId).eq('device_id', job.deviceId)
    return true
  } catch (reason) {
    const terminal = reason?.terminal === true || Number(job.attempts) >= 5 || [404, 410].includes(Number(reason?.statusCode))
    const message = String(reason?.message ?? 'native_push_failed').slice(0, 500)
    await admin.from('native_push_deliveries').update({ status: terminal ? 'failed' : 'pending', last_error: message })
      .eq('notification_id', job.notificationId).eq('device_id', job.deviceId)
    if ([404, 410].includes(Number(reason?.statusCode)) || /unregistered|baddevicetoken/i.test(message)) await admin.from('native_push_devices').update({ enabled: false }).eq('id', job.deviceId)
    if (terminal) {
      try { await admin.from('operational_events').insert({ source: 'native-push-dispatch', severity: 'warning', code: `${job.platform}_push_failed`, message, metadata: { attempts: job.attempts } }) } catch { /* best-effort telemetry */ }
    }
    return false
  }
}

async function firebaseAccessToken() {
  const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  const now = Math.floor(Date.now() / 1000)
  const claim = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: account.token_uri || 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`
  const signer = createSign('RSA-SHA256'); signer.update(claim); signer.end()
  const assertion = `${claim}.${signer.sign(String(account.private_key).replaceAll('\\n', '\n')).toString('base64url')}`
  const result = await fetch(account.token_uri || 'https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) })
  const payload = await result.json()
  if (!result.ok || !payload.access_token) throw new Error('fcm_oauth_failed')
  return { token: payload.access_token, projectId: account.project_id }
}

async function sendFcm(job, access) {
  const result = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(access.projectId)}/messages:send`, { method: 'POST', headers: { Authorization: `Bearer ${access.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: { token: job.token, notification: { title: job.title, body: job.body }, data: { path: job.path, notificationId: job.notificationId }, android: { priority: 'high', notification: { channel_id: 'rumen_reminders' } } } }) })
  if (!result.ok) { const detail = await result.text(); throw Object.assign(new Error(detail.slice(0, 500) || 'fcm_send_failed'), { statusCode: result.status, terminal: result.status === 404 }) }
}

async function sendApns(job) {
  const keyId = process.env.APNS_KEY_ID; const teamId = process.env.APNS_TEAM_ID; const bundleId = process.env.APNS_BUNDLE_ID
  if (!keyId || !teamId || !bundleId) throw Object.assign(new Error('apns_not_configured'), { terminal: true })
  const now = Math.floor(Date.now() / 1000)
  const unsigned = `${encode({ alg: 'ES256', kid: keyId })}.${encode({ iss: teamId, iat: now })}`
  const signature = cryptoSign(null, Buffer.from(unsigned), { key: String(process.env.APNS_PRIVATE_KEY).replaceAll('\\n', '\n'), dsaEncoding: 'ieee-p1363' }).toString('base64url')
  const authority = process.env.APNS_ENVIRONMENT === 'sandbox' ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com'
  const client = http2.connect(authority)
  try {
    await new Promise((resolve, reject) => {
      const request = client.request({ ':method': 'POST', ':path': `/3/device/${job.token}`, authorization: `bearer ${unsigned}.${signature}`, 'apns-topic': bundleId, 'apns-push-type': 'alert', 'apns-priority': '10', 'content-type': 'application/json' })
      let status = 0; let body = ''
      request.on('response', (headers) => { status = Number(headers[':status']) })
      request.on('data', (chunk) => { body += chunk })
      request.on('end', () => status === 200 ? resolve() : reject(Object.assign(new Error(body || `apns_${status}`), { statusCode: status, terminal: status === 400 || status === 410 })))
      request.on('error', reject)
      request.end(JSON.stringify({ aps: { alert: { title: job.title, body: job.body }, sound: 'default' }, path: job.path, notificationId: job.notificationId }))
    })
  } finally { client.close() }
}

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const response = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) })
