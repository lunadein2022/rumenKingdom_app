import { supabase } from '../lib/supabase'
import type { Relationship } from '../types'

// Relationships map to the `relationships` table (expanded by the migration).
// businessCardImageRef / sourceAttachment are not persisted yet.
type RelationshipRow = {
  id: string
  name: string
  organization: string | null
  position: string | null
  phone: string | null
  email: string | null
  social: string | null
  address: string | null
  role: string | null
  first_met_at: string | null
  last_contacted_at: string | null
  notes: string | null
  tags: string[] | null
  favorite: boolean | null
  business_card_ocr_text: string | null
  source: string | null
  created_at: string
  updated_at: string
}

const COLUMNS =
  'id,name,organization,position,phone,email,social,address,role,first_met_at,last_contacted_at,notes,tags,favorite,business_card_ocr_text,source,created_at,updated_at'

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

async function getUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

const fromRow = (row: RelationshipRow): Relationship => ({
  id: row.id,
  name: row.name,
  organization: row.organization ?? '',
  position: row.position ?? '',
  phone: row.phone ?? '',
  email: row.email ?? '',
  social: row.social ?? '',
  address: row.address ?? undefined,
  relationshipType: row.role ?? '',
  firstMetAt: row.first_met_at ?? undefined,
  lastContactedAt: row.last_contacted_at ?? undefined,
  memo: row.notes ?? '',
  tags: row.tags ?? [],
  favorite: row.favorite ?? false,
  businessCardOcrText: row.business_card_ocr_text ?? undefined,
  source: row.source === 'rita' ? 'rita' : 'manual',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const toRow = (value: Partial<Relationship>): Record<string, unknown> => {
  const row: Record<string, unknown> = {}
  if (value.name !== undefined) row.name = value.name
  if (value.organization !== undefined) row.organization = value.organization
  if (value.position !== undefined) row.position = value.position
  if (value.phone !== undefined) row.phone = value.phone
  if (value.email !== undefined) row.email = value.email
  if (value.social !== undefined) row.social = value.social
  if (value.address !== undefined) row.address = value.address ?? ''
  if (value.relationshipType !== undefined) row.role = value.relationshipType
  if (value.firstMetAt !== undefined) row.first_met_at = value.firstMetAt || null
  if (value.lastContactedAt !== undefined) row.last_contacted_at = value.lastContactedAt || null
  if (value.memo !== undefined) row.notes = value.memo
  if (value.tags !== undefined) row.tags = value.tags
  if (value.favorite !== undefined) row.favorite = value.favorite
  if (value.businessCardOcrText !== undefined) row.business_card_ocr_text = value.businessCardOcrText ?? null
  if (value.source !== undefined) row.source = value.source
  return row
}

export async function listRelationships(): Promise<Relationship[] | null> {
  const userId = await getUserId()
  if (!supabase || !userId) return null
  const { data, error } = await supabase.from('relationships').select(COLUMNS).order('created_at', { ascending: false })
  if (error) throw error
  return (data as RelationshipRow[]).map(fromRow)
}

export async function createRelationship(relationship: Relationship): Promise<void> {
  const userId = await getUserId()
  if (!supabase || !userId || !isUuid(relationship.id)) return
  const { error } = await supabase.from('relationships').insert({
    id: relationship.id,
    user_id: userId,
    ...toRow(relationship),
    created_at: relationship.createdAt,
    updated_at: relationship.updatedAt,
  })
  if (error) throw error
}

export async function updateRelationship(id: string, patch: Partial<Relationship>): Promise<void> {
  const userId = await getUserId()
  if (!supabase || !userId || !isUuid(id)) return
  const { error } = await supabase
    .from('relationships')
    .update({ ...toRow(patch), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function removeRelationship(id: string): Promise<void> {
  const userId = await getUserId()
  if (!supabase || !userId || !isUuid(id)) return
  const { error } = await supabase.from('relationships').delete().eq('id', id)
  if (error) throw error
}
