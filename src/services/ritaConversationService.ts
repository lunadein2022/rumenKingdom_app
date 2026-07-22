import { supabase } from '../lib/supabase'

export type StoredRitaMessage = { from: 'rita' | 'user'; text: string; expression?: string }

export async function loadRecentRitaConversation(): Promise<StoredRitaMessage[]> {
  if (!supabase) return []
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase.from('ai_conversations')
    .select('messages')
    .gte('updated_at', cutoff)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return normalizeMessages(data?.messages)
}

export async function saveRitaConversation(messages: StoredRitaMessage[]) {
  if (!supabase) return
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return
  const safe = normalizeMessages(messages).slice(-40)
  const { data: existing } = await supabase.from('ai_conversations').select('id').order('updated_at', { ascending: false }).limit(1).maybeSingle()
  const payload = { user_id: auth.user.id, title: '리타와의 대화', messages: safe, updated_at: new Date().toISOString() }
  const query = existing?.id ? supabase.from('ai_conversations').update(payload).eq('id', existing.id) : supabase.from('ai_conversations').insert(payload)
  const { error } = await query
  if (error) throw error
}

export async function deleteRitaConversations() {
  if (!supabase) return
  const { error } = await supabase.from('ai_conversations').delete().lt('created_at', '9999-12-31T00:00:00Z')
  if (error) throw error
}

function normalizeMessages(value: unknown): StoredRitaMessage[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is StoredRitaMessage => Boolean(item && typeof item === 'object' && ((item as StoredRitaMessage).from === 'rita' || (item as StoredRitaMessage).from === 'user') && typeof (item as StoredRitaMessage).text === 'string'))
    .map((item) => ({ from: item.from, text: item.text.slice(0, 4000), ...(typeof item.expression === 'string' ? { expression: item.expression } : {}) }))
}
