import { supabase } from '../lib/supabase'
import type { RelationshipGroup } from '../types'

type RelationshipGroupRow = {
  id: string
  name: string
  color: string | null
  sort_order: number | null
  created_at: string
  updated_at: string
}

async function getUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

const fromRow = (row: RelationshipGroupRow): RelationshipGroup => ({
  id: row.id,
  name: row.name,
  color: row.color ?? '#8f78b5',
  sortOrder: row.sort_order ?? 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export async function listRelationshipGroups(): Promise<RelationshipGroup[] | null> {
  const userId = await getUserId()
  if (!supabase || !userId) return null
  const { data, error } = await supabase
    .from('relationship_groups')
    .select('id,name,color,sort_order,created_at,updated_at')
    .order('sort_order')
    .order('name')
  if (error) throw error
  return (data as RelationshipGroupRow[]).map(fromRow)
}

export async function createRelationshipGroup(group: RelationshipGroup): Promise<boolean> {
  const userId = await getUserId()
  if (!supabase || !userId) return false
  const { error } = await supabase.from('relationship_groups').insert({
    id: group.id,
    user_id: userId,
    name: group.name,
    color: group.color,
    sort_order: group.sortOrder,
    created_at: group.createdAt,
    updated_at: group.updatedAt,
  })
  if (error) throw error
  return true
}

export async function updateRelationshipGroup(id: string, patch: Partial<RelationshipGroup>): Promise<boolean> {
  const userId = await getUserId()
  if (!supabase || !userId) return false
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.name !== undefined) row.name = patch.name
  if (patch.color !== undefined) row.color = patch.color
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder
  const { error } = await supabase.from('relationship_groups').update(row).eq('id', id)
  if (error) throw error
  return true
}

export async function removeRelationshipGroup(id: string): Promise<boolean> {
  const userId = await getUserId()
  if (!supabase || !userId) return false
  const { error } = await supabase.from('relationship_groups').delete().eq('id', id)
  if (error) throw error
  return true
}
