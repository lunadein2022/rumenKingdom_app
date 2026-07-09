import { requireSupabase } from "./client";
import { supabaseTables } from "./schemaMap";

export async function listCastleRooms(userId: string) {
  const supabase = requireSupabase();

  // TODO: replace mockCastleRooms and PalaceRoomSection stats with castle_rooms data.
  return supabase
    .from(supabaseTables.castleRooms)
    .select("*")
    .eq("user_id", userId)
    .order("room_key");
}
