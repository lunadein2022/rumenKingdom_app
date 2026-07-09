import { useMemo, useState } from "react";
import type { Quest, QuestCompletionEvent, QuestHistoryEntry, SerinAction, UserProgress } from "../../../app/types";
import { buildMockProgress } from "../../../data/mockProgress";
import { completeQuestDomain, questTypeMeta } from "../../../domain/questDomain";

function buildProgress(quests: Quest[], base: UserProgress): UserProgress {
  return {
    ...buildMockProgress(quests, base.currentExp, base.requiredExp),
    level: base.level,
    streakDays: base.streakDays,
  };
}

export function createQuestFromSerinAction(action: SerinAction): Quest {
  const payload = action.payload.quest ?? {};
  return {
    id: `q-serin-${Date.now()}`,
    type: payload.type ?? "side",
    title: payload.title ?? action.title,
    description: payload.description ?? "세린의 대화에서 정리한 Quest입니다.",
    status: "pending",
    category: payload.category ?? "growth",
    priority: payload.priority ?? "medium",
    progress: payload.progress ?? 0,
    expReward: payload.expReward ?? questTypeMeta.side.baseExp,
    goldReward: payload.goldReward ?? 8,
    dueDate: payload.dueDate ?? "2026-07-09",
    rewardClaimed: false,
    source: "serin",
  };
}

export function useQuestDomain(initialQuests: Quest[], initialHistory: QuestHistoryEntry[], initialProgress: UserProgress) {
  const [quests, setQuests] = useState<Quest[]>(initialQuests);
  const [history, setHistory] = useState<QuestHistoryEntry[]>(initialHistory);
  const [completionEvents, setCompletionEvents] = useState<QuestCompletionEvent[]>([]);
  const [progressBase, setProgressBase] = useState<UserProgress>(initialProgress);
  const progress = useMemo(() => buildProgress(quests, progressBase), [quests, progressBase]);

  function completeQuest(id: string) {
    const result = completeQuestDomain(quests, history, id, progress);
    setQuests(result.quests);
    setHistory(result.history);
    setCompletionEvents(result.events);
    setProgressBase(result.progress);
    return quests.find((quest) => quest.id === id) ?? null;
  }

  function cycleQuest(id: string) {
    setQuests((current) =>
      current.map((quest) => {
        if (quest.id !== id) return quest;
        const next = quest.status === "pending" ? "inProgress" : quest.status === "inProgress" ? "completed" : "pending";
        return {
          ...quest,
          status: next,
          completedAt: next === "completed" ? new Date().toISOString() : undefined,
          rewardClaimed: next === "completed" ? false : quest.rewardClaimed,
        };
      }),
    );
  }

  function addQuest(quest: Quest) {
    setQuests((current) => [quest, ...current]);
  }

  return {
    quests,
    history,
    completionEvents,
    progress,
    addQuest,
    completeQuest,
    cycleQuest,
  };
}
