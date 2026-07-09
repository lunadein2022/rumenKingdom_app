import { getPrincessOsSnapshot } from "../../data/mockRepository";
import { sendMessage } from "../../features/serin/services/serinService";
import type { PrincessOsRepository } from "../types";

export const supabasePrincessOsRepository: PrincessOsRepository = {
  getSnapshot() {
    // TODO: Replace fallback composition with Supabase repository reads:
    // profiles, princess_profiles, quests, quest_history, calendar_events,
    // user_progress, castle_rooms, achievements, inventory_items, serin_*.
    return getPrincessOsSnapshot();
  },
  sendSerinMessage(input) {
    // TODO: Persist request/response in serin_conversations and serin_messages.
    return sendMessage(input);
  },
};
