import { supabase } from '../lib/supabase'
import type { Quest } from '../types'

// Quests map to the canonical `quests` table created by the data-model migration.
// status/priority are enums that match the app types. There is no tags column
// (tags belong to the future entity_tags table), so tags do not round-trip yet.
type QuestRow = {
  id: string
  main_quest_id: string | null
  parent_quest_id: string | null
  kind: Quest['type']
  title: string
  description: string | null
  memo: string | null
  status: Quest['status']
  priority: Quest['priority']
  scheduled_on: string | null
  due_on: string | null
  due_at: string | null
  favorite: boolean | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

const COLUMNS =
  'id,main_quest_id,parent_quest_id,kind,title,description,memo,status,priority,scheduled_on,due_on,due_at,favorite,completed_at,created_at,updated_at'

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

async function getUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

const fromRow = (row: QuestRow): Quest => {
  const scheduledDate = row.scheduled_on ?? row.due_on ?? undefined
  const scheduledTime = row.due_at ? String(row.due_at).slice(0, 5) : undefined
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    memo: row.memo ?? '',
    tags: [],
    projectId: row.main_quest_id ?? undefined,
    parentQuestId: row.parent_quest_id ?? undefined,
    project: undefined,
    type: row.kind,
    status: row.status,
    due: scheduledDate ? `${scheduledDate}${scheduledTime ? ` ${scheduledTime}` : ''}` : '일정 없음',
    scheduledDate,
    scheduledTime,
    done: row.status === 'completed',
    priority: row.priority,
    favorite: row.favorite ?? false,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listQuests(): Promise<Quest[] | null> {
  const userId = await getUserId()
  if (!supabase || !userId) return null
  const { data, error } = await supabase.from('quests').select(COLUMNS).order('created_at')
  if (error) throw error
  return (data as QuestRow[]).map(fromRow)
}

export async function createQuest(quest: Quest): Promise<void> {
  const userId = await getUserId()
  if (!supabase || !userId || !isUuid(quest.id)) return
  const completed = quest.status === 'completed'
  const { error } = await supabase.from('quests').insert({
    id: quest.id,
    user_id: userId,
    // Composite FKs require the referenced row to belong to the same user; skip non-uuid/local ids.
    main_quest_id: quest.projectId && isUuid(quest.projectId) ? quest.projectId : null,
    parent_quest_id: quest.parentQuestId && isUuid(quest.parentQuestId) ? quest.parentQuestId : null,
    kind: quest.type,
    title: quest.title,
    description: quest.description ?? '',
    memo: quest.memo ?? '',
    status: quest.status,
    priority: quest.priority,
    scheduled_on: quest.scheduledDate || null,
    due_on: quest.scheduledDate || null,
    due_at: quest.scheduledTime || null,
    favorite: quest.favorite ?? false,
    completed_at: completed ? quest.completedAt ?? new Date().toISOString() : null,
    created_at: quest.createdAt,
    updated_at: quest.updatedAt,
  })
  if (error) throw error
}

export async function updateQuest(id: string, patch: Partial<Quest>): Promise<void> {
  const userId = await getUserId()
  if (!supabase || !userId || !isUuid(id)) return
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.title !== undefined) row.title = patch.title
  if (patch.description !== undefined) row.description = patch.description ?? ''
  if (patch.memo !== undefined) row.memo = patch.memo ?? ''
  if (patch.type !== undefined) row.kind = patch.type
  if (patch.priority !== undefined) row.priority = patch.priority
  if (patch.favorite !== undefined) row.favorite = patch.favorite
  if ('projectId' in patch) row.main_quest_id = patch.projectId && isUuid(patch.projectId) ? patch.projectId : null
  if ('parentQuestId' in patch) row.parent_quest_id = patch.parentQuestId && isUuid(patch.parentQuestId) ? patch.parentQuestId : null
  if ('scheduledDate' in patch) {
    row.scheduled_on = patch.scheduledDate || null
    row.due_on = patch.scheduledDate || null
  }
  if ('scheduledTime' in patch) row.due_at = patch.scheduledTime || null
  if (patch.status !== undefined) {
    row.status = patch.status
    row.completed_at = patch.status === 'completed' ? patch.completedAt ?? new Date().toISOString() : null
  } else if ('completedAt' in patch) {
    row.completed_at = patch.completedAt ?? null
  }
  const { error } = await supabase.from('quests').update(row).eq('id', id)
  if (error) throw error
}

export async function removeQuest(id: string): Promise<void> {
  const userId = await getUserId()
  if (!supabase || !userId || !isUuid(id)) return
  const { error } = await supabase.from('quests').delete().eq('id', id)
  if (error) throw error
}
