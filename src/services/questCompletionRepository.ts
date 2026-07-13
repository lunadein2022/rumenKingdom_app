import { supabase } from '../lib/supabase'
import type { QuestCompletion } from '../types'

type CompletionRow = {
  quest_id: string
  occurrence_date: string
  completed_at: string
}

const COLUMNS = 'quest_id,occurrence_date,completed_at'

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

async function getUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

export async function listQuestCompletions(): Promise<QuestCompletion[] | null> {
  const userId = await getUserId()
  if (!supabase || !userId) return null
  const { data, error } = await supabase
    .from('quest_completion_logs')
    .select(COLUMNS)
    .order('occurrence_date')
  if (error) throw error
  return (data as CompletionRow[]).map((row) => ({
    questId: row.quest_id,
    occurrenceDate: row.occurrence_date,
    completedAt: row.completed_at,
  }))
}

export async function saveQuestCompletion(completion: QuestCompletion): Promise<boolean> {
  const userId = await getUserId()
  if (!supabase || !userId || !isUuid(completion.questId)) return false
  const { error } = await supabase.from('quest_completion_logs').upsert({
    user_id: userId,
    quest_id: completion.questId,
    occurrence_date: completion.occurrenceDate,
    completed_at: completion.completedAt,
  }, { onConflict: 'user_id,quest_id,occurrence_date' })
  if (error) throw error
  return true
}

export async function removeQuestCompletion(questId: string, occurrenceDate: string): Promise<boolean> {
  const userId = await getUserId()
  if (!supabase || !userId || !isUuid(questId)) return false
  const { error } = await supabase
    .from('quest_completion_logs')
    .delete()
    .eq('quest_id', questId)
    .eq('occurrence_date', occurrenceDate)
  if (error) throw error
  return true
}
