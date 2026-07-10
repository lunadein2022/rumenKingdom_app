import type { Quest, UserProgress } from "../app/types";
import { getKoreanToday } from "../app/dateUtils";

// 진행률 스냅샷을 실제 퀘스트 상태에서 계산합니다. 고정 레벨/고정 연속일 같은
// 가짜 수치를 두지 않습니다 — level/streakDays는 호출부(App)의 진행 상태가
// 소유하고, 여기서는 기본값(시작 상태)만 돌려줍니다.
export function buildMockProgress(quests: Quest[], currentExp: number, requiredExp: number): UserProgress {
  const today = getKoreanToday();
  const todayQuests = quests.filter((quest) => quest.dueDate === today);
  const completedQuests = quests.filter((quest) => quest.status === "completed");
  const todayCompletedQuests = todayQuests.filter((quest) => quest.status === "completed");
  const pendingRewards = completedQuests.filter((quest) => !quest.rewardClaimed).length;
  const expRate = requiredExp > 0 ? Math.min(100, Math.round((currentExp / requiredExp) * 100)) : 0;
  const todayProgress = todayQuests.length
    ? Math.round((todayCompletedQuests.length / todayQuests.length) * 100)
    : 0;

  return {
    level: 1,
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
    streakDays: 0,
  };
}
