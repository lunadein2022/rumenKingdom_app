import { requireSupabase } from "./client";
import { supabaseTables } from "./schemaMap";

export async function listQuests(userId: string) {
  const supabase = requireSupabase();

  // TODO: connect QuestModule and progress selectors to this query.
  return supabase
    .from(supabaseTables.quests)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
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
