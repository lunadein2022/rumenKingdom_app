import type {
  CalendarEvent,
  Quest,
  QuestCompletionEvent,
  QuestHistoryEntry,
  QuestType,
  UserProgress,
} from "../app/types";
import { buildMockProgress } from "../data/mockProgress";

export const questTypeMeta: Record<QuestType, { icon: string; label: string; baseExp: number }> = {
  main: { icon: "♛", label: "메인", baseExp: 300 },
  side: { icon: "★", label: "서브", baseExp: 80 },
  daily: { icon: "☀", label: "일일", baseExp: 20 },
  routine: { icon: "↻", label: "반복", baseExp: 40 },
  story: { icon: "▣", label: "스토리", baseExp: 500 },
};

export const questCompletionFlow: QuestCompletionEvent[] = [
  { type: "check", label: "확인" },
  { type: "glow", label: "Glow" },
  { type: "exp", label: "EXP 획득" },
  { type: "reward", label: "보상 획득" },
  { type: "level", label: "레벨 계산" },
  { type: "castle", label: "왕궁 반영" },
  { type: "achievement", label: "업적 확인" },
  { type: "notification", label: "알림" },
  { type: "history", label: "왕국도서관 저장" },
];

export function getActiveQuestsByType(quests: Quest[], type: QuestType) {
  return quests.filter((quest) => quest.type === type && quest.status !== "completed");
}

export function getCompletedQuests(quests: Quest[]) {
  return quests.filter((quest) => quest.status === "completed");
}

export function completeQuestDomain(
  quests: Quest[],
  history: QuestHistoryEntry[],
  questId: string,
  baseProgress: UserProgress,
) {
  const completedAt = new Date().toISOString();
  const quest = quests.find((item) => item.id === questId);

  if (!quest || quest.status === "completed") {
    return {
      quests,
      history,
      progress: buildMockProgress(quests, baseProgress.currentExp, baseProgress.requiredExp),
      events: [] as QuestCompletionEvent[],
    };
  }

  const updatedQuests = quests.map((item) =>
    item.id === questId
      ? {
          ...item,
          status: "completed" as const,
          progress: 100,
          completedAt,
          rewardClaimed: false,
        }
      : item,
  );

  const updatedHistory: QuestHistoryEntry[] = [
    {
      id: `qh-${quest.id}-${Date.now()}`,
      questId: quest.id,
      completedAt,
      rewardExp: quest.expReward,
      rewardItem: quest.rewardItem,
      note: `${questTypeMeta[quest.type].label} Quest가 완료되어 왕국도서관으로 이동했습니다.`,
    },
    ...history,
  ];

  const earnedExp = quest.expReward;
  const currentExp = baseProgress.currentExp + earnedExp;
  const requiredExp = baseProgress.requiredExp;
  const leveled = currentExp >= requiredExp;
  const progress = buildMockProgress(
    updatedQuests,
    leveled ? currentExp - requiredExp : currentExp,
    leveled ? Math.round(requiredExp * 1.18) : requiredExp,
  );

  return {
    quests: updatedQuests,
    history: updatedHistory,
    progress: {
      ...progress,
      level: leveled ? baseProgress.level + 1 : baseProgress.level,
      streakDays: baseProgress.streakDays,
    },
    events: questCompletionFlow,
  };
}

export function createQuestFromSerinDraft(title: string): Quest {
  const now = new Date().toISOString();
  // TODO:
  // Replace with Supabase Query and AI intent parser.
  return {
    id: `q-serin-${Date.now()}`,
    type: "daily",
    title,
    description: "세린의 대화에서 추출한 일일 Quest 초안입니다.",
    status: "pending",
    category: "routine",
    priority: "medium",
    progress: 0,
    expReward: questTypeMeta.daily.baseExp,
    goldReward: 4,
    dueDate: now.slice(0, 10),
    rewardClaimed: false,
    source: "serin",
  };
}

export function createQuestFromCalendarEvent(event: CalendarEvent): Quest {
  // TODO:
  // Replace with Supabase Query and calendar-to-quest transaction.
  return {
    id: `q-calendar-${Date.now()}`,
    type: event.category === "routine" ? "routine" : event.category === "quest" ? "side" : "daily",
    title: event.title,
    description: `${event.location ?? "루멘 왕성"} 일정에서 생성된 Quest입니다.`,
    status: "pending",
    category: event.category === "work" || event.category === "meeting" ? "work" : event.category === "routine" ? "routine" : "growth",
    priority: event.priority,
    progress: 0,
    expReward: event.category === "quest" ? questTypeMeta.side.baseExp : questTypeMeta.daily.baseExp,
    goldReward: event.category === "quest" ? 12 : 4,
    dueDate: event.startAt.slice(0, 10),
    rewardClaimed: false,
    source: "calendar",
  };
}
