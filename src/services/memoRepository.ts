import { supabase } from '../lib/supabase'
import type { Memo } from '../types'

// Memos map to the canonical `memos` table. sourceAttachment metadata is not
// persisted yet (that belongs to the future attachments wiring).
type MemoRow = {
  id: string
  main_quest_id: string | null
  title: string
  content: string | null
  transcript: string | null
  status: Memo['status']
  source: string
  important: boolean | null
  favorite: boolean | null
  tags: string[] | null
  created_at: string
  updated_at: string
}

const COLUMNS =
  'id,main_quest_id,title,content,transcript,status,source,important,favorite,tags,created_at,updated_at'

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

async function getUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

const fromRow = (row: MemoRow): Memo => ({
  id: row.id,
  title: row.title,
  content: row.content ?? '',
  tags: row.tags ?? [],
  projectId: row.main_quest_id ?? undefined,
  important: row.important ?? false,
  favorite: row.favorite ?? false,
  status: row.status,
  source: row.source === 'manual' ? 'manual' : 'rita',
  transcript: row.transcript ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export async function listMemos(): Promise<Memo[] | null> {
  const userId = await getUserId()
  if (!supabase || !userId) return null
  const { data, error } = await supabase.from('memos').select(COLUMNS).order('created_at', { ascending: false })
  if (error) throw error
  return (data as MemoRow[]).map(fromRow)
}

export async function createMemo(memo: Memo): Promise<void> {
  const userId = await getUserId()
  if (!supabase || !userId || !isUuid(memo.id)) return
  const { error } = await supabase.from('memos').insert({
    id: memo.id,
    user_id: userId,
    main_quest_id: memo.projectId && isUuid(memo.projectId) ? memo.projectId : null,
    title: memo.title,
    content: memo.content ?? '',
    transcript: memo.transcript ?? null,
    status: memo.status,
    source: memo.source,
    important: memo.important ?? false,
    favorite: memo.favorite ?? false,
    tags: memo.tags ?? [],
    created_at: memo.createdAt,
    updated_at: memo.updatedAt,
  })
  if (error) throw error
}

export async function updateMemo(id: string, patch: Partial<Memo>): Promise<void> {
  const userId = await getUserId()
  if (!supabase || !userId || !isUuid(id)) return
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.title !== undefined) row.title = patch.title
  if (patch.content !== undefined) row.content = patch.content ?? ''
  if (patch.transcript !== undefined) row.transcript = patch.transcript ?? null
  if (patch.status !== undefined) row.status = patch.status
  if (patch.source !== undefined) row.source = patch.source
  if (patch.important !== undefined) row.important = patch.important
  if (patch.favorite !== undefined) row.favorite = patch.favorite
  if (patch.tags !== undefined) row.tags = patch.tags
  if ('projectId' in patch) row.main_quest_id = patch.projectId && isUuid(patch.projectId) ? patch.projectId : null
  const { error } = await supabase.from('memos').update(row).eq('id', id)
  if (error) throw error
}

export async function removeMemo(id: string): Promise<void> {
  const userId = await getUserId()
  if (!supabase || !userId || !isUuid(id)) return
  const { error } = await supabase.from('memos').delete().eq('id', id)
  if (error) throw error
}
