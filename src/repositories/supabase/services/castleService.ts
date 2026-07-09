import { requireSupabase } from "./client";
import { supabaseTables } from "./schemaMap";

export async function listCastleRooms(userId: string) {
  const supabase = requireSupabase();

  // TODO: replace mockCastleRooms and room scene stats with castle_rooms data.
  return supabase
    .from(supabaseTables.castleRooms)
    .select("*")
    .eq("user_id", userId)
    .order("room_key");
}

export async function getCastleState(userId: string) {
  const supabase = requireSupabase();

  // TODO: Replace with Supabase Query
  return supabase
    .from(supabaseTables.castleState)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
}

export async function visitCastleRoom(userId: string, roomKey: string) {
  const supabase = requireSupabase();

  // TODO: Replace with Supabase RPC that increments visited_count.
  return supabase
    .from(supabaseTables.castleRooms)
    .update({ is_discovered: true })
    .eq("user_id", userId)
    .eq("room_key", roomKey);
}
