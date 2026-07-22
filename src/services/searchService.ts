import { supabase } from '../lib/supabase'

export type KingdomSearchResult = { id: string; title: string; meta: string; path: string; date?: string }

export async function searchKingdom(query: string, page = 1): Promise<{ items: KingdomSearchResult[]; total: number }> {
  if (!supabase || !query.trim()) return { items: [], total: 0 }
  const { data, error } = await supabase.rpc('search_my_kingdom', {
    p_query: query.trim(),
    p_limit: 20,
    p_offset: (Math.max(1, page) - 1) * 20,
  })
  if (error) throw error
  const result = data as { items?: Array<{ id: string; kind: string; title: string; summary?: string; path: string }>; total?: number }
  return {
    total: Number(result.total) || 0,
    items: (result.items ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      meta: [searchKindLabel(item.kind), item.summary].filter(Boolean).join(' · '),
      path: item.path,
    })),
  }
}

function searchKindLabel(kind: string) {
  return ({ project: '메인퀘스트', daily_quest: '일일퀘스트', sub_quest: '서브퀘스트', calendar: '일정', memo: '비망록', relationship: '인연록', diary: '다이어리' } as Record<string, string>)[kind] ?? kind
}
