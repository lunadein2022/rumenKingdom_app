import { supabase } from '../lib/supabase'

export type AccountNotification = {
  id: string
  title: string
  body: string
  kind: string
  readAt?: string
  createdAt: string
  path: string
}

export async function loadAccountNotifications(limit = 30): Promise<AccountNotification[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('notifications')
    .select('id,title,body,kind,read_at,created_at,related_entity_type,related_entity_id')
    .or(`scheduled_for.is.null,scheduled_for.lte.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(Math.trunc(limit) || 30, 1), 100))
  if (error) throw new Error('계정 알림을 불러오지 못했습니다.')
  return (data ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    body: item.body,
    kind: item.kind,
    readAt: item.read_at ?? undefined,
    createdAt: item.created_at,
    path: notificationPath(item.related_entity_type, item.related_entity_id),
  }))
}

function notificationPath(entityType: string | null, entityId: string | null) {
  if (entityType === 'calendar_event' && entityId) return `/calendar/event/${entityId}`
  if (entityType === 'quest') return '/office'
  if (entityType === 'memo' && entityId) return `/library/memos/${entityId}`
  if (entityType === 'relationship' && entityId) return `/library/relationships/${entityId}`
  return '/notifications'
}

export async function markAccountNotificationRead(id: string) {
  if (!supabase) return
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error('알림을 읽음 처리하지 못했습니다.')
}

export async function markAccountNotificationsRead(ids: string[]) {
  if (!supabase || !ids.length) return
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids)
  if (error) throw new Error('알림을 모두 읽음 처리하지 못했습니다.')
}
