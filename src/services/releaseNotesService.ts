import { supabase } from '../lib/supabase'
import { latestPatchNote, type PatchNote } from '../lib/patchNotes'

type ReleaseRow = {
  version: string
  title: string
  items: string[]
  release_date: string
}

export async function loadLatestPatchNote(platform: 'web' | 'ios' | 'android' = 'web'): Promise<PatchNote> {
  if (!supabase) return latestPatchNote
  const { data, error } = await supabase
    .from('app_releases')
    .select('version,title,items,release_date')
    .eq('is_published', true)
    .contains('platforms', [platform])
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return latestPatchNote
  const row = data as ReleaseRow
  const serverNote = {
    version: row.version,
    date: row.release_date,
    title: row.title,
    items: Array.isArray(row.items) ? row.items.map(String).slice(0, 30) : [],
  }
  return compareVersions(serverNote.version, latestPatchNote.version) >= 0 ? serverNote : latestPatchNote
}

function compareVersions(left: string, right: string) {
  const parts = (value: string) => value.split(/[.+-]/).slice(0, 3).map((part) => Number(part) || 0)
  const a = parts(left); const b = parts(right)
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1
  }
  return 0
}
