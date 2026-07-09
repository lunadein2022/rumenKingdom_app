import type { Quest, UserProgress } from "../app/types";

export function buildMockProgress(quests: Quest[], currentExp: number, requiredExp: number): UserProgress {
  const today = "2026-07-09";
  const todayQuests = quests.filter((quest) => quest.dueDate === today);
  const completedQuests = quests.filter((quest) => quest.status === "completed");
  const todayCompletedQuests = todayQuests.filter((quest) => quest.status === "completed");
  const pendingRewards = completedQuests.filter((quest) => !quest.rewardClaimed).length;
  const expRate = Math.min(100, Math.round((currentExp / requiredExp) * 100));
  const todayProgress = todayQuests.length
    ? Math.round((todayCompletedQuests.length / todayQuests.length) * 100)
    : 0;

  return {
    level: 7,
    currentExp,
    requiredExp,
    expRate,
    completedQuests: completedQuests.length,
    totalQuests: quests.length,
    todayCompletedQuests: todayCompletedQuests.length,
    todayTotalQuests: todayQuests.length,
    todayProgress,
    pendingRewards,
    // TODO: replace with Supabase daily completion streak calculation.
    streakDays: 5,
  };
}
