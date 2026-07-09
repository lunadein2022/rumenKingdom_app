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

export async function getOrCreateConversation(userId: string) {
  const supabase = requireSupabase();

  // TODO: Replace mock lookup with a dedicated default conversation upsert.
  const { data } = await supabase
    .from(supabaseTables.serinConversations)
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function getSerinMessages(conversationId: string) {
  const supabase = requireSupabase();

  // TODO: Replace with paginated Supabase Query.
  return supabase
    .from(supabaseTables.serinMessages)
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
}

export async function saveSerinMessage(message: Record<string, unknown>) {
  const supabase = requireSupabase();

  // TODO: Replace with typed insert once auth user mapping is finalized.
  return supabase.from(supabaseTables.serinMessages).insert(message);
}
