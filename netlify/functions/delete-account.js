import { createClient } from '@supabase/supabase-js'

const responseHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
}

const json = (statusCode, body) => ({ statusCode, headers: responseHeaders, body: JSON.stringify(body) })

async function listStorageFiles(client, bucket, prefix) {
  const paths = []
  for (let offset = 0;; offset += 1000) {
    const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000, offset })
    if (error) throw error
    for (const item of data ?? []) {
      if (!item.name) continue
      const path = `${prefix}/${item.name}`
      if (item.id) paths.push(path)
      else paths.push(...await listStorageFiles(client, bucket, path))
    }
    if ((data?.length ?? 0) < 1000) break
  }
  return paths
}

async function removeUserStorage(client, bucket, userId) {
  const paths = await listStorageFiles(client, bucket, userId)
  for (let offset = 0; offset < paths.length; offset += 1000) {
    const { error } = await client.storage.from(bucket).remove(paths.slice(offset, offset + 1000))
    if (error) throw error
  }
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' })

  const supabaseUrl = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json(503, { error: 'server_not_configured' })

  const token = String(event.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return json(401, { error: 'authentication_required' })

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'invalid_json' }) }
  if (body.confirmation !== 'DELETE MY ACCOUNT') return json(400, { error: 'confirmation_required' })

  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: authData, error: authError } = await authClient.auth.getUser(token)
  if (authError || !authData.user) return json(401, { error: 'invalid_session' })

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  try {
    await removeUserStorage(admin, 'rita-attachments', authData.user.id)
    await removeUserStorage(admin, 'room-backgrounds', authData.user.id)
    const { error } = await admin.auth.admin.deleteUser(authData.user.id)
    if (error) throw error
    return json(200, { deleted: true })
  } catch (error) {
    console.error('Account deletion failed', error instanceof Error ? error.message : error)
    return json(500, { error: 'account_deletion_failed' })
  }
}
