import type { CalendarIntentDraft } from "../../../app/types";
import { questTypeMeta } from "../../../domain/questDomain";
import type { SerinAction, SerinParsedIntent } from "../types/serin.types";

export function executeIntent(parsedIntent: SerinParsedIntent): SerinAction | null {
  const actionId = `serin-action-${Date.now()}`;

  if (parsedIntent.intent === "calendar.create") {
    const draft = parsedIntent.entities.calendar as CalendarIntentDraft;
    return {
      id: actionId,
      intent: "calendar.create",
      title: draft.title,
      summary: `${draft.startAt.slice(0, 16).replace("T", " ")} 일정으로 등록합니다.`,
      confirmLabel: "일정 등록",
      secondaryLabel: "Quest도 만들기",
      payload: {
        calendar: {
          title: draft.title,
          description: `세린이 "${draft.sourceMessage}" 요청에서 정리한 일정입니다.`,
          startAt: draft.startAt,
          endAt: draft.endAt,
          location: "루멘 왕성",
          category: draft.category,
          priority: "medium",
          isAllDay: false,
          reminderMinutes: 10,
          createdBy: "serin",
        },
      },
    };
  }

  if (parsedIntent.intent === "quest.create") {
    const quest = parsedIntent.entities.quest as { title?: string; dueDate?: string };
    return {
      id: actionId,
      intent: "quest.create",
      title: quest.title ?? "새 Quest",
      summary: "공주의 성장에 반영할 Quest로 등록합니다.",
      confirmLabel: "Quest 등록",
      payload: {
        quest: {
          title: quest.title ?? "새 Quest",
          description: "세린의 대화에서 정리한 Quest입니다.",
          type: "side",
          priority: "medium",
          progress: 0,
          expReward: questTypeMeta.side.baseExp,
          goldReward: 8,
          dueDate: quest.dueDate ?? "2026-07-09",
          rewardClaimed: false,
          source: "serin",
        },
      },
    };
  }

  if (parsedIntent.intent === "memory.save" && parsedIntent.entities.memory) {
    return {
      id: actionId,
      intent: "memory.save",
      title: "세린 기억",
      summary: "대화 내용을 세린 기억으로 저장합니다.",
      confirmLabel: "기억 저장",
      payload: {
        memory: parsedIntent.entities.memory as SerinAction["payload"]["memory"],
      },
    };
  }

  return null;
}

export function confirmAction(action: SerinAction) {
  // TODO: Replace with Supabase Query and domain transaction
  return {
    actionId: action.id,
    intent: action.intent,
    completedAt: new Date().toISOString(),
  };
}

export function cancelAction(action: SerinAction) {
  // TODO: Replace with Supabase Query
  return {
    actionId: action.id,
    intent: action.intent,
    cancelledAt: new Date().toISOString(),
  };
}
