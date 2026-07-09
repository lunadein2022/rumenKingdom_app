import { requireSupabase } from "./client";
import { supabaseTables } from "./schemaMap";

export async function getPrincessProfile(userId: string) {
  const supabase = requireSupabase();

  // TODO: replace mockPrincess and mockTitles with joined Supabase profile/title data.
  return supabase
    .from(supabaseTables.princessProfiles)
    .select("*")
    .eq("user_id", userId)
    .single();
}

export async function listUserTitles(userId: string) {
  const supabase = requireSupabase();

  // TODO: hydrate Royal Title chips from user_titles.
  return supabase
    .from(supabaseTables.userTitles)
    .select("*")
    .eq("user_id", userId);
}
