import { supabase } from '../lib/supabase'
import type { DiaryEntry, DiaryQuestSnapshot } from '../types'
import { applySyncMutation, rememberSyncRevision } from '../lib/syncEngine'

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
  revision: number
}

const COLUMNS = 'id,entry_date,title,body,mood,favorite,tags,created_at,updated_at,revision'

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

async function getUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

const fromRow = (row: DiaryRow): DiaryEntry => {
  rememberSyncRevision('diary', row.id, row.revision)
  return ({
  id: row.id,
  revision: row.revision,
  date: row.entry_date,
  title: row.title ?? '',
  content: row.body ?? '',
  mood: row.mood ?? '',
  favorite: row.favorite ?? false,
  tags: row.tags ?? [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  })
}

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

async function saveDiaryAtomically(entry: Partial<DiaryEntry> & Pick<DiaryEntry, 'id'>, operation: 'create' | 'update') {
  const payload = {
    ...toRow(entry),
    quest_snapshots: (entry.questSnapshots ?? []).filter((item) => isUuid(item.sourceQuestId)).map((item) => ({
      source_quest_id: item.sourceQuestId,
      title: item.title,
      note: item.note ?? '',
      imported_at: item.importedAt,
    })),
  }
  await applySyncMutation({ entityType: 'diary', operation, recordId: entry.id, payload, expectedRevision: entry.revision })
  return true
}

export async function createDiary(entry: DiaryEntry): Promise<boolean> {
  const userId = await getUserId()
  if (!supabase || !userId || !isUuid(entry.id)) return false
  return saveDiaryAtomically(entry, 'create')
}

export async function updateDiary(id: string, patch: Partial<DiaryEntry>): Promise<boolean> {
  const userId = await getUserId()
  if (!supabase || !userId || !isUuid(id)) return false
  return saveDiaryAtomically({ id, ...patch }, 'update')
}

export async function removeDiary(id: string): Promise<boolean> {
  const userId = await getUserId()
  if (!supabase || !userId || !isUuid(id)) return false
  await applySyncMutation({ entityType: 'diary', operation: 'delete', recordId: id })
  return true
}
