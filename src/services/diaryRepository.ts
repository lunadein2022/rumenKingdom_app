import { supabase } from '../lib/supabase'
import type { DiaryEntry, DiaryQuestSnapshot } from '../types'

// Diary entries map to diary_entries. The canonical body column is `body`.
type DiaryRow = {
  id: string
  entry_date: string
  title: string | null
  body: string | null
  mood: string | null
  favorite: boolean | null
  tags: string[] | null
  created_at: string
  updated_at: string
}

const COLUMNS = 'id,entry_date,title,body,mood,favorite,tags,created_at,updated_at'

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

async function getUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

const fromRow = (row: DiaryRow): DiaryEntry => ({
  id: row.id,
  date: row.entry_date,
  title: row.title ?? '',
  content: row.body ?? '',
  mood: row.mood ?? '',
  favorite: row.favorite ?? false,
  tags: row.tags ?? [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const toRow = (value: Partial<DiaryEntry>): Record<string, unknown> => {
  const row: Record<string, unknown> = {}
  if (value.date !== undefined) row.entry_date = value.date
  if (value.title !== undefined) row.title = value.title
  if (value.content !== undefined) row.body = value.content
  if (value.mood !== undefined) row.mood = value.mood
  if (value.favorite !== undefined) row.favorite = value.favorite
  if (value.tags !== undefined) row.tags = value.tags
  return row
}

export async function listDiaries(): Promise<DiaryEntry[] | null> {
  const userId = await getUserId()
  if (!supabase || !userId) return null
  const { data, error } = await supabase.from('diary_entries').select(COLUMNS).order('entry_date', { ascending: false })
  if (error) throw error
  const { data: links, error: linkError } = await supabase.from('diary_quest_links').select('diary_id,source_quest_id,snapshot_title,snapshot_note,imported_at')
  if (linkError) throw linkError
  const byDiary = new Map<string, DiaryQuestSnapshot[]>()
  for (const link of links ?? []) {
    const list = byDiary.get(link.diary_id) ?? []
    list.push({ sourceQuestId: link.source_quest_id, title: link.snapshot_title, note: link.snapshot_note, importedAt: link.imported_at })
    byDiary.set(link.diary_id, list)
  }
  return (data as DiaryRow[]).map((row) => ({ ...fromRow(row), questSnapshots: byDiary.get(row.id) ?? [] }))
}

async function syncQuestSnapshots(diaryId: string, snapshots: DiaryQuestSnapshot[] = []) {
  const userId = await getUserId()
  if (!supabase || !userId) return
  const { data: current, error: readError } = await supabase.from('diary_quest_links').select('source_quest_id').eq('diary_id', diaryId)
  if (readError) throw readError
  const wanted = new Set(snapshots.map((item) => item.sourceQuestId))
  const remove = (current ?? []).filter((item) => !wanted.has(item.source_quest_id)).map((item) => item.source_quest_id)
  if (remove.length) {
    const { error } = await supabase.from('diary_quest_links').delete().eq('diary_id', diaryId).in('source_quest_id', remove)
    if (error) throw error
  }
  if (snapshots.length) {
    const { error } = await supabase.from('diary_quest_links').upsert(snapshots.map((item) => ({
      user_id: userId,
      diary_id: diaryId,
      quest_id: isUuid(item.sourceQuestId) ? item.sourceQuestId : null,
      source_quest_id: item.sourceQuestId,
      snapshot_title: item.title,
      snapshot_note: item.note ?? '',
    })), { onConflict: 'user_id,diary_id,source_quest_id' })
    if (error) throw error
  }
}

export async function createDiary(entry: DiaryEntry): Promise<boolean> {
  const userId = await getUserId()
  if (!supabase || !userId || !isUuid(entry.id)) return false
  const { error } = await supabase.from('diary_entries').insert({
    id: entry.id,
    user_id: userId,
    ...toRow(entry),
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  })
  if (error) throw error
  await syncQuestSnapshots(entry.id, entry.questSnapshots)
  return true
}

export async function updateDiary(id: string, patch: Partial<DiaryEntry>): Promise<boolean> {
  const userId = await getUserId()
  if (!supabase || !userId || !isUuid(id)) return false
  const { error } = await supabase
    .from('diary_entries')
    .update({ ...toRow(patch), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
  if (patch.questSnapshots !== undefined) await syncQuestSnapshots(id, patch.questSnapshots)
  return true
}

export async function removeDiary(id: string): Promise<boolean> {
  const userId = await getUserId()
  if (!supabase || !userId || !isUuid(id)) return false
  const { error } = await supabase.from('diary_entries').delete().eq('id', id)
  if (error) throw error
  return true
}
