import type { Quest, QuestHistoryEntry } from "../app/types";

// 초기 상태는 완전히 비어 있습니다. 퀘스트는 사용자가 세린에게 말하거나 직접
// 등록한 것만 존재해야 하며, "등록된 것처럼 보이는" 가짜 데이터를 두지 않습니다.
// TODO: Replace with Supabase Query from quests.
export const mockQuests: Quest[] = [];

// TODO: Replace with Supabase Query from quest_history.
export const mockQuestHistory: QuestHistoryEntry[] = [];
