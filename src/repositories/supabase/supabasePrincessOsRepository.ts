import { sendMessage } from "../../features/serin/services/serinService";
import type { PrincessOsRepository } from "../types";

export const supabasePrincessOsRepository: PrincessOsRepository = {
  getSnapshot() {
    // TODO: Implement Supabase repository reads:
    // profiles, princess_profiles, quests, quest_history, calendar_events,
    // user_progress, castle_rooms, achievements, inventory_items, serin_*.
    throw new Error("Supabase repository is not connected yet. Use VITE_USE_MOCK=true until mapping is implemented.");
  },
  sendSerinMessage(input) {
    // TODO: Persist request/response in serin_conversations and serin_messages.
    return sendMessage(input);
  },
};
