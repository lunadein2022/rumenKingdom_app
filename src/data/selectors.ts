import type { AppMockData, Quest } from "../app/types";
import { getKoreanToday } from "../app/dateUtils";

export function selectTodayQuests(data: AppMockData, today = getKoreanToday()): Quest[] {
  // TODO: replace with Supabase query filtered by quests.due_date.
  return data.quests.filter((quest) => quest.dueDate === today);
}

export function selectCompletedQuests(data: AppMockData): Quest[] {
  // TODO: replace with Supabase aggregate over quests.status.
  return data.quests.filter((quest) => quest.status === "completed");
}

export function selectPendingRewards(data: AppMockData): number {
  // TODO: replace with Supabase query where completed quests have reward_claimed=false.
  return data.quests.filter((quest) => quest.status === "completed" && !quest.rewardClaimed).length;
}

export function selectProgress(data: AppMockData) {
  return {
    todayTotal: data.progress.todayTotalQuests,
    todayCompleted: data.progress.todayCompletedQuests,
    completionPercent: data.progress.todayProgress,
    completedTotal: data.progress.completedQuests,
    pendingRewards: data.progress.pendingRewards,
    expPercent: data.progress.expRate,
  };
}
