import { requireSupabase } from "./client";
import { supabaseTables } from "./schemaMap";

export async function listSerinMemory(userId: string) {
  const supabase = requireSupabase();

  // TODO: connect Serin profile, memory, and chat context to serin_memory.
  return supabase
    .from(supabaseTables.serinMemory)
    .select("*")
    .eq("user_id", userId)
    .order("importance", { ascending: false });
}

export async function listSerinConversations(userId: string) {
  const supabase = requireSupabase();

  // TODO: use this when Serin AI chat history is moved into Supabase.
  return supabase
    .from(supabaseTables.serinConversations)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
}
