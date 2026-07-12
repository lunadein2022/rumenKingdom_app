import { supabase } from '../lib/supabase'
import type { Project } from '../types'

// Projects map to the legacy `main_quests` table. Its status/priority stay text,
// and it has no `user_id` default, so inserts must set user_id explicitly.
type ProjectRow = {
  id: string
  title: string
  goal: string | null
  description: string | null
  memo: string | null
  tags: string[] | null
  progress: number | null
  start_date: string | null
  due_date: string | null
  status: Project['status']
  priority: Project['priority']
  favorite: boolean | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

const COLUMNS =
  'id,title,goal,description,memo,tags,progress,start_date,due_date,status,priority,favorite,completed_at,created_at,updated_at'

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

async function getUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

const fromRow = (row: ProjectRow): Project => ({
  id: row.id,
  title: row.title,
  goal: row.goal ?? '',
  description: row.description ?? '',
  memo: row.memo ?? '',
  tags: row.tags ?? [],
  // `tag` is a legacy single-label field with no canonical column; derive it from tags.
  tag: row.tags?.[0] ?? 'Project',
  progress: row.progress ?? 0,
  startDate: row.start_date ?? row.due_date ?? '',
  due: row.due_date ?? '',
  status: row.status,
  priority: row.priority,
  favorite: row.favorite ?? false,
  completedAt: row.completed_at ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export async function listProjects(): Promise<Project[] | null> {
  const userId = await getUserId()
  if (!supabase || !userId) return null
  const { data, error } = await supabase.from('main_quests').select(COLUMNS).order('created_at')
  if (error) throw error
  return (data as ProjectRow[]).map(fromRow)
}

export async function createProject(project: Project): Promise<void> {
  const userId = await getUserId()
  if (!supabase || !userId || !isUuid(project.id)) return
  const { error } = await supabase.from('main_quests').insert({
    id: project.id,
    user_id: userId,
    title: project.title,
    goal: project.goal ?? '',
    description: project.description ?? '',
    memo: project.memo ?? '',
    tags: project.tags ?? [],
    progress: project.progress ?? 0,
    start_date: project.startDate || null,
    due_date: project.due || null,
    status: project.status,
    priority: project.priority,
    favorite: project.favorite ?? false,
    completed_at: project.completedAt ?? null,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  })
  if (error) throw error
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<void> {
  const userId = await getUserId()
  if (!supabase || !userId || !isUuid(id)) return
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.title !== undefined) row.title = patch.title
  if (patch.goal !== undefined) row.goal = patch.goal
  if (patch.description !== undefined) row.description = patch.description
  if (patch.memo !== undefined) row.memo = patch.memo
  if (patch.tags !== undefined) row.tags = patch.tags
  if (patch.progress !== undefined) row.progress = patch.progress
  if (patch.startDate !== undefined) row.start_date = patch.startDate || null
  if (patch.due !== undefined) row.due_date = patch.due || null
  if (patch.status !== undefined) row.status = patch.status
  if (patch.priority !== undefined) row.priority = patch.priority
  if (patch.favorite !== undefined) row.favorite = patch.favorite
  if ('completedAt' in patch) row.completed_at = patch.completedAt ?? null
  const { error } = await supabase.from('main_quests').update(row).eq('id', id)
  if (error) throw error
}

export async function removeProject(id: string): Promise<void> {
  const userId = await getUserId()
  if (!supabase || !userId || !isUuid(id)) return
  const { error } = await supabase.from('main_quests').delete().eq('id', id)
  if (error) throw error
}
