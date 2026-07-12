import { supabase } from '../lib/supabase'
import type { SourceAttachment } from '../types'

type AttachmentRow = {
  entity_id: string
  storage_path: string
  file_name: string
  mime_type: string | null
  size_bytes: number | null
}

async function getUserId() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

export async function listAttachmentMap(entityType: 'memo' | 'relationship') {
  if (!supabase || !(await getUserId())) return new Map<string, SourceAttachment>()
  const { data, error } = await supabase.from('attachments')
    .select('entity_id,storage_path,file_name,mime_type,size_bytes')
    .eq('entity_type', entityType)
  if (error) throw error
  return new Map((data as AttachmentRow[]).map((row) => [row.entity_id, {
    name: row.file_name,
    mimeType: row.mime_type ?? 'application/octet-stream',
    size: Number(row.size_bytes ?? 0),
    storagePath: row.storage_path,
  }]))
}

export async function saveAttachment(entityType: 'memo' | 'relationship', entityId: string, attachment?: SourceAttachment) {
  const userId = await getUserId()
  if (!supabase || !userId || !attachment?.storagePath) return false
  const { error } = await supabase.from('attachments').insert({
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId,
    storage_path: attachment.storagePath,
    file_name: attachment.name,
    mime_type: attachment.mimeType,
    size_bytes: attachment.size,
  })
  if (error && error.code !== '23505') throw error
  return true
}
