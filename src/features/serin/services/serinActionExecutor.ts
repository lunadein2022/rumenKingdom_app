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
      summary: `${draft.startAt.slice(0, 16).replace("T", " ")} 일정으로 등록할까요?`,
      confirmLabel: "일정 추가",
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
      summary: "공주의 성장에 반영될 Quest로 생성할까요?",
      confirmLabel: "Quest 생성",
      payload: {
        quest: {
          title: quest.title ?? "새 Quest",
          description: "세린이 대화에서 정리한 Quest입니다.",
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

  if (parsedIntent.intent === "diary.create" || parsedIntent.intent === "diary.summarize") {
    return {
      id: actionId,
      intent: parsedIntent.intent,
      title: "오늘의 공주 다이어리",
      summary: "오늘 일정, 완료 Quest, 세린과의 대화를 바탕으로 다이어리 초안을 저장할까요?",
      confirmLabel: "다이어리 초안 저장",
      payload: {
        diary: {
          title: "오늘의 공주 다이어리",
          content: "오늘의 흐름을 정리한 다이어리 초안입니다.",
        },
      },
    };
  }

  if (parsedIntent.intent === "contact.extract") {
    return {
      id: actionId,
      intent: "contact.extract",
      title: "새 연락처",
      summary: "첨부 이미지 또는 대화에서 추출한 연락처를 왕국도서관에 저장할까요?",
      confirmLabel: "연락처 저장",
      payload: {
        contact: {
          name: "새 연락처",
          memo: "OCR 연결 전 mock 추출 결과입니다.",
        },
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
