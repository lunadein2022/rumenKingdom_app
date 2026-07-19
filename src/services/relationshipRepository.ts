import { supabase } from '../lib/supabase'
import type { Relationship } from '../types'
import { listAttachmentMap } from './attachmentRepository'
import { applySyncMutation, rememberSyncRevision } from '../lib/syncEngine'

// Relationships map to the expanded `relationships` table; private business
// card metadata is joined from the owner-scoped attachments table.
type RelationshipRow = {
  id: string
  name: string
  organization: string | null
  position: string | null
  phone: string | null
  email: string | null
  social: string | null
  address: string | null
  relationship_type: string | null
  first_met_at: string | null
  last_contacted_at: string | null
  notes: string | null
  tags: string[] | null
  favorite: boolean | null
  business_card_ocr_text: string | null
  source: string | null
  created_at: string
  updated_at: string
  revision: number
}

const COLUMNS =
  'id,name,organization,position,phone,email,social,address,relationship_type,first_met_at,last_contacted_at,notes,tags,favorite,business_card_ocr_text,source,created_at,updated_at,revision'

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

async function getUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

const fromRow = (row: RelationshipRow, groupIds: string[] = []): Relationship => {
  rememberSyncRevision('relationship', row.id, row.revision)
  return ({
  id: row.id,
  revision: row.revision,
  name: row.name,
  organization: row.organization ?? '',
  position: row.position ?? '',
  phone: row.phone ?? '',
  email: row.email ?? '',
  social: row.social ?? '',
  address: row.address ?? undefined,
  relationshipType: row.relationship_type ?? '',
  firstMetAt: row.first_met_at ?? undefined,
  lastContactedAt: row.last_contacted_at ?? undefined,
  memo: row.notes ?? '',
  tags: row.tags ?? [],
  groupIds,
  favorite: row.favorite ?? false,
  businessCardOcrText: row.business_card_ocr_text ?? undefined,
  source: row.source === 'rita' ? 'rita' : 'manual',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  })
}

const toRow = (value: Partial<Relationship>): Record<string, unknown> => {
  const row: Record<string, unknown> = {}
  if (value.name !== undefined) row.name = value.name
  if (value.organization !== undefined) row.organization = value.organization
  if (value.position !== undefined) row.position = value.position
  if (value.phone !== undefined) row.phone = value.phone
  if (value.email !== undefined) row.email = value.email
  if (value.social !== undefined) row.social = value.social
  if (value.address !== undefined) row.address = value.address ?? ''
  if (value.relationshipType !== undefined) row.relationship_type = value.relationshipType
  if (value.firstMetAt !== undefined) row.first_met_at = value.firstMetAt || null
  if (value.lastContactedAt !== undefined) row.last_contacted_at = value.lastContactedAt || null
  if (value.memo !== undefined) row.notes = value.memo
  if (value.tags !== undefined) row.tags = value.tags
  if (value.favorite !== undefined) row.favorite = value.favorite
  if (value.businessCardOcrText !== undefined) row.business_card_ocr_text = value.businessCardOcrText ?? null
  if (value.source !== undefined) row.source = value.source
  return row
}

async function saveRelationshipAtomically(relationship: Relationship, operation: 'create' | 'update') {
  const attachment = relationship.sourceAttachment?.storagePath ? {
    storage_path: relationship.sourceAttachment.storagePath,
    file_name: relationship.sourceAttachment.name,
    mime_type: relationship.sourceAttachment.mimeType,
    size_bytes: relationship.sourceAttachment.size,
  } : null
  await applySyncMutation({
    entityType: 'relationship',
    operation,
    recordId: relationship.id,
    expectedRevision: relationship.revision,
    payload: {
      ...toRow(relationship),
      group_ids: Array.from(new Set(relationship.groupIds.filter(isUuid))),
      attachment,
    },
  })
  return true
}

export async function listRelationships(): Promise<Relationship[] | null> {
  const userId = await getUserId()
  if (!supabase || !userId) return null
  const { data, error } = await supabase.from('relationships').select(COLUMNS).order('created_at', { ascending: false })
  if (error) throw error
  const [{ data: memberships, error: membershipError }, attachments] = await Promise.all([
    supabase.from('relationship_group_members').select('relationship_id,group_id'),
    listAttachmentMap('relationship'),
  ])
  if (membershipError) throw membershipError
  const groupMap = new Map<string, string[]>()
  for (const membership of memberships ?? []) {
    const ids = groupMap.get(membership.relationship_id) ?? []
    ids.push(membership.group_id)
    groupMap.set(membership.relationship_id, ids)
  }
  return (data as RelationshipRow[]).map((row) => {
    const attachment = attachments.get(row.id)
    return { ...fromRow(row, groupMap.get(row.id)), sourceAttachment: attachment, businessCardImageRef: attachment?.storagePath }
  })
}

export async function createRelationship(relationship: Relationship): Promise<boolean> {
  const userId = await getUserId()
  if (!supabase || !userId || !isUuid(relationship.id)) return false
  return saveRelationshipAtomically(relationship, 'create')
}

export async function updateRelationship(id: string, patch: Partial<Relationship>): Promise<boolean> {
  const userId = await getUserId()
  if (!supabase || !userId || !isUuid(id)) return false
  return saveRelationshipAtomically(patch as Relationship, 'update')
}

export async function removeRelationship(id: string): Promise<boolean> {
  const userId = await getUserId()
  if (!supabase || !userId || !isUuid(id)) return false
  await applySyncMutation({ entityType: 'relationship', operation: 'delete', recordId: id })
  return true
}
