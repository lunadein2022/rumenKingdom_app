import { createClient } from '@supabase/supabase-js'

export async function handler() {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return { statusCode: 503 }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: jobs, error } = await admin.from('storage_cleanup_queue')
    .select('id,bucket_id,storage_path,attempts')
    .is('processed_at', null)
    .lt('attempts', 10)
    .order('id')
    .limit(100)
  if (error) throw error

  let processed = 0
  for (const job of jobs ?? []) {
    const { error: removeError } = await admin.storage.from(job.bucket_id).remove([job.storage_path])
    if (removeError) {
      await admin.from('storage_cleanup_queue').update({
        attempts: Number(job.attempts) + 1,
        last_error: String(removeError.message || 'storage_remove_failed').slice(0, 500),
      }).eq('id', job.id)
      continue
    }
    await admin.from('storage_cleanup_queue').update({
      processed_at: new Date().toISOString(),
      attempts: Number(job.attempts) + 1,
      last_error: null,
    }).eq('id', job.id)
    processed += 1
  }
  return { statusCode: 200, body: JSON.stringify({ processed }) }
}

