import { supabase } from '../lib/supabase'

export const SERVER_PAGE_SIZE = 20

export type ServerEntity = 'projects' | 'quests' | 'calendar_events' | 'memos' | 'relationships' | 'diaries'
export type ServerPage<T extends Record<string, unknown> = Record<string, unknown>> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Shared web/iOS/Android list endpoint. Summary screens may still hydrate the
 * offline cache, while list clients use this endpoint to download 20 rows at a time.
 */
export async function getServerEntityPage<T extends Record<string, unknown> = Record<string, unknown>>(
  entity: ServerEntity,
  page = 1,
  query = '',
): Promise<ServerPage<T>> {
  if (!supabase) throw new Error('Supabase가 설정되지 않았어요.')
  const safePage = Math.max(1, Math.trunc(page) || 1)
  const { data, error } = await supabase.rpc('get_my_entity_page', {
    p_entity: entity,
    p_limit: SERVER_PAGE_SIZE,
    p_offset: (safePage - 1) * SERVER_PAGE_SIZE,
    p_query: query.trim(),
  })
  if (error) throw error
  const result = (data ?? {}) as { items?: T[]; total?: number }
  const total = Math.max(0, Number(result.total) || 0)
  return {
    items: Array.isArray(result.items) ? result.items : [],
    total,
    page: safePage,
    pageSize: SERVER_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / SERVER_PAGE_SIZE)),
  }
}
