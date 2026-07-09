import { requireSupabase } from "./client";
import { supabaseTables } from "./schemaMap";

export async function listQuests(userId: string) {
  const supabase = requireSupabase();

  // TODO: connect QuestScreen and progress selectors to this query.
  return supabase
    .from(supabaseTables.quests)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export async function listQuestHistory(userId: string) {
  const supabase = requireSupabase();

  // TODO:
  // Replace mock questHistory with Supabase Query from quest_history.
  return supabase
    .from(supabaseTables.questHistory)
    .select("*")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });
}

export async function completeQuestTransaction(userId: string, questId: string) {
  const supabase = requireSupabase();

  // TODO:
  // Move Quest completion pipeline into a Supabase RPC:
  // check -> glow event -> EXP -> reward -> level -> castle -> achievement -> notification -> history.
  return supabase
    .from(supabaseTables.quests)
    .update({
      status: "completed",
      progress: 100,
      completed_at: new Date().toISOString(),
      reward_claimed: false,
    })
    .eq("user_id", userId)
    .eq("id", questId)
    .select("*")
    .single();
}

export async function listTodayQuests(userId: string, date: string) {
  const supabase = requireSupabase();

  // TODO: use this for todayProgress where due_date equals the local app date.
  return supabase
    .from(supabaseTables.quests)
    .select("*")
    .eq("user_id", userId)
    .eq("due_date", date);
}
