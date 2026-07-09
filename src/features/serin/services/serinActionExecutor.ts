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
      summary: `공주님, '${draft.title}'을(를) ${draft.startAt.slice(0, 16).replace("T", " ")} 일정으로 등록해드릴까요? 알림도 함께 챙겨드릴게요.`,
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

  if (parsedIntent.intent === "project.create") {
    const title = parsedIntent.entities.title as string;
    return {
      id: actionId,
      intent: "project.create",
      title,
      summary: `공주님, '${title}'을(를) 새 메인퀘스트(프로젝트)로 집무실에 등록해드릴까요?`,
      confirmLabel: "프로젝트 생성",
      payload: {
        mainQuest: { title },
      },
    };
  }

  if (parsedIntent.intent === "project.update") {
    const mainQuestTitle = parsedIntent.entities.mainQuestTitle as string;
    const content = parsedIntent.entities.content as string;
    return {
      id: actionId,
      intent: "project.update",
      title: mainQuestTitle,
      summary: `공주님, '${mainQuestTitle}' 프로젝트에 이 내용을 업데이트 로그로 남겨드릴까요?`,
      confirmLabel: "업데이트 기록",
      payload: {
        mainQuestUpdate: { mainQuestId: mainQuestTitle, content },
      },
    };
  }

  if (parsedIntent.intent === "quest.create") {
    const quest = parsedIntent.entities.quest as { title?: string; dueDate?: string };
    return {
      id: actionId,
      intent: "quest.create",
      title: quest.title ?? "새 Quest",
      summary: `공주님, '${quest.title ?? "이 일"}'을(를) 퀘스트로 등록해드릴까요? 처리하시기 편한 시간을 알려주시면 그에 맞춰 챙겨드릴게요.`,
      confirmLabel: "Quest 생성",
      payload: {
        quest: {
          title: quest.title ?? "새 Quest",
          description: "세린이 대화에서 정리한 Quest입니다.",
          type: "daily",
          priority: "medium",
          progress: 0,
          expReward: questTypeMeta.daily.baseExp,
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
      summary: "공주님, 오늘 일정과 완료한 Quest를 바탕으로 다이어리 초안을 정리해드릴까요?",
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
      summary: "공주님, 첨부 이미지나 대화에서 찾은 연락처를 인연록에 저장해드릴까요?",
      confirmLabel: "인연록에 저장",
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
