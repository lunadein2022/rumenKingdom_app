import { requireSupabase } from "./client";
import { supabaseTables } from "./schemaMap";

export async function getUserProgress(userId: string) {
  const supabase = requireSupabase();

  // TODO: replace MockData progress with this query and daily streak aggregation.
  return supabase
    .from(supabaseTables.userProgress)
    .select("*")
    .eq("user_id", userId)
    .single();
}

export async function listDailyCompletions(userId: string) {
  const supabase = requireSupabase();

  // TODO: calculate streakDays from consecutive daily_completions rows with quest_count >= 1.
  return supabase
    .from(supabaseTables.dailyCompletions)
    .select("*")
    .eq("user_id", userId)
    .order("completion_date", { ascending: false });
}
