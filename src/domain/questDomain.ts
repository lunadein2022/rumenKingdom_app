import type {
  CalendarEvent,
  Quest,
  QuestCompletionEvent,
  QuestHistoryEntry,
  QuestType,
  UserProgress,
} from "../app/types";
import { buildMockProgress } from "../data/mockProgress";
import { newId } from "../app/ids";

// 메인퀘스트(=프로젝트)는 이 파일이 아니라 domain/mainQuestDomain.ts가 다룹니다.
// 여기서는 실행형 퀘스트(서브/일일)만 다룹니다.
export const questTypeMeta: Record<QuestType, { icon: string; label: string; baseExp: number }> = {
  side: { icon: "⭐", label: "서브", baseExp: 80 },
  daily: { icon: "☀", label: "일일", baseExp: 20 },
};

export const questCompletionFlow: QuestCompletionEvent[] = [
  { type: "check", label: "체크" },
  { type: "glow", label: "Glow" },
  { type: "exp", label: "EXP 획득" },
  { type: "reward", label: "보상 획득" },
  { type: "level", label: "레벨 계산" },
  { type: "title", label: "칭호 확인" },
  { type: "notification", label: "Notification" },
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
      id: newId(),
      questId: quest.id,
      completedAt,
      rewardExp: quest.expReward,
      rewardItem: quest.rewardItem,
      note: `${questTypeMeta[quest.type].label} 퀘스트가 완료되어 왕국도서관으로 이동했습니다.`,
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

// 체크 해제(완료 취소): 방금 완료로 표시한 Quest를 다시 대기 상태로 되돌리고,
// 왕국도서관 기록과 EXP도 함께 롤백합니다. (레벨업까지 되돌리는 정밀한 트랜잭션은
// Supabase RPC 연동 시 처리할 몫이라, 지금은 EXP는 0 아래로 내려가지 않게만 막습니다.)
export function uncompleteQuestDomain(
  quests: Quest[],
  history: QuestHistoryEntry[],
  questId: string,
  baseProgress: UserProgress,
) {
  const quest = quests.find((item) => item.id === questId);

  if (!quest || quest.status !== "completed") {
    return {
      quests,
      history,
      progress: buildMockProgress(quests, baseProgress.currentExp, baseProgress.requiredExp),
      events: [] as QuestCompletionEvent[],
    };
  }

  const updatedQuests = quests.map((item) =>
    item.id === questId
      ? { ...item, status: "pending" as const, progress: 0, completedAt: undefined, rewardClaimed: false }
      : item,
  );

  const updatedHistory = history.filter(
    (entry) => !(entry.questId === questId && entry.completedAt === quest.completedAt),
  );

  const revertedExp = Math.max(0, baseProgress.currentExp - quest.expReward);
  const progress = buildMockProgress(updatedQuests, revertedExp, baseProgress.requiredExp);

  return {
    quests: updatedQuests,
    history: updatedHistory,
    progress: {
      ...progress,
      level: baseProgress.level,
      streakDays: baseProgress.streakDays,
    },
    events: [] as QuestCompletionEvent[],
  };
}

// 체크박스 하나로 완료/완료취소를 모두 처리하는 진입점입니다. Home의 오늘의
// Quest 체크리스트와 QuestScreen의 완료 버튼이 함께 씁니다.
export function setQuestCompletion(
  quests: Quest[],
  history: QuestHistoryEntry[],
  questId: string,
  completed: boolean,
  baseProgress: UserProgress,
) {
  return completed
    ? completeQuestDomain(quests, history, questId, baseProgress)
    : uncompleteQuestDomain(quests, history, questId, baseProgress);
}

export function createQuestFromSerinDraft(title: string, mainQuestId?: string): Quest {
  const now = new Date().toISOString();
  // TODO:
  // Replace with Supabase Query and AI intent parser.
  return {
    id: newId(),
    type: "daily",
    title,
    description: "세린의 대화에서 추출한 일일 퀘스트 초안입니다.",
    status: "pending",
    category: "routine",
    priority: "medium",
    progress: 0,
    mainQuestId,
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
    id: newId(),
    type: "daily",
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
