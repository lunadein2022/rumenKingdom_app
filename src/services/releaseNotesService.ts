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
  return {
    version: row.version,
    date: row.release_date,
    title: row.title,
    items: Array.isArray(row.items) ? row.items.map(String).slice(0, 30) : [],
  }
}
