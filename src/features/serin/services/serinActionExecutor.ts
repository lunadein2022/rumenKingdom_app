import type { CalendarIntentDraft } from "../../../app/types";
import { getKoreanToday } from "../../../app/dateUtils";
import { questTypeMeta } from "../../../domain/questDomain";
import type { SerinAction, SerinParsedIntent } from "../types/serin.types";

export function executeIntent(parsedIntent: SerinParsedIntent): SerinAction | null {
  const actionId = `serin-action-${Date.now()}`;

  if (parsedIntent.intent === "calendar.create") {
    const draft = parsedIntent.entities.calendar as CalendarIntentDraft;
    const summary = draft.isMultiDay
      ? `공주님, ${draft.confirmSummary ?? draft.title}할까요? 종일 일정으로 표시해드릴게요.`
      : `공주님, '${draft.title}'을(를) ${draft.startAt.slice(0, 16).replace("T", " ")} 일정으로 등록해드릴까요? 알림도 함께 챙겨드릴게요.`;
    return {
      id: actionId,
      intent: "calendar.create",
      title: draft.title,
      summary,
      confirmLabel: "일정 추가",
      secondaryLabel: draft.isMultiDay ? undefined : "Quest도 만들기",
      payload: {
        calendar: {
          title: draft.title,
          description: `세린이 "${draft.sourceMessage}" 요청에서 정리한 일정입니다.`,
          startAt: draft.startAt,
          endAt: draft.endAt,
          location: "루멘 왕성",
          category: draft.category,
          priority: "medium",
          isAllDay: Boolean(draft.isAllDay),
          reminderMinutes: draft.isAllDay ? null : 10,
          createdBy: "serin",
        },
      },
      logEntries: [
        {
          domain: "calendar",
          label: draft.title,
          detail: draft.isMultiDay
            ? `${draft.startAt.slice(0, 10)} ~ ${draft.endAt?.slice(0, 10) ?? draft.startAt.slice(0, 10)} 등록`
            : `${draft.startAt.slice(0, 16).replace("T", " ")} 등록`,
        },
      ],
    };
  }

  if (parsedIntent.intent === "calendar.update") {
    const eventTitle = parsedIntent.entities.eventTitle as string;
    const eventId = parsedIntent.entities.eventId as string;
    const draft = parsedIntent.entities.draft as CalendarIntentDraft;
    return {
      id: actionId,
      intent: "calendar.update",
      title: eventTitle,
      summary: `공주님, '${eventTitle}' 일정을 ${draft.startAt.slice(0, 16).replace("T", " ")}(으)로 옮겨드릴까요?`,
      confirmLabel: "일정 변경",
      payload: {
        calendarUpdate: {
          eventId,
          changes: { startAt: draft.startAt, endAt: draft.endAt, isAllDay: draft.isAllDay },
        },
      },
      logEntries: [
        { domain: "calendar", label: eventTitle, detail: `${draft.startAt.slice(0, 16).replace("T", " ")}(으)로 변경` },
      ],
    };
  }

  if (parsedIntent.intent === "calendar.delete") {
    const eventTitle = parsedIntent.entities.eventTitle as string;
    const eventId = parsedIntent.entities.eventId as string;
    return {
      id: actionId,
      intent: "calendar.delete",
      title: eventTitle,
      summary: `공주님, '${eventTitle}' 일정을 취소해드릴까요?`,
      confirmLabel: "일정 취소",
      payload: { calendarDelete: { eventId } },
      logEntries: [{ domain: "calendar", label: eventTitle, detail: "일정 취소" }],
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
      logEntries: [{ domain: "project", label: title, detail: "새 메인퀘스트 생성" }],
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
      logEntries: [{ domain: "project", label: mainQuestTitle, detail: "업데이트 로그 기록" }],
    };
  }

  if (parsedIntent.intent === "project.rename") {
    const mainQuestTitle = parsedIntent.entities.mainQuestTitle as string;
    const newTitle = (parsedIntent.entities.newTitle as string) || "";
    if (!newTitle) return null;
    return {
      id: actionId,
      intent: "project.rename",
      title: mainQuestTitle,
      summary: `공주님, '${mainQuestTitle}'을(를) '${newTitle}'(으)로 이름을 바꿔드릴까요?`,
      confirmLabel: "이름 변경",
      payload: {
        mainQuestRename: { mainQuestId: mainQuestTitle, newTitle },
      },
      logEntries: [{ domain: "project", label: mainQuestTitle, detail: `이름을 '${newTitle}'(으)로 변경` }],
    };
  }

  if (parsedIntent.intent === "quest.create") {
    const quest = parsedIntent.entities.quest as { title?: string; dueDate?: string; type?: "daily" | "side" };
    const questType = quest.type === "side" ? "side" : "daily";
    const typeLabel = questTypeMeta[questType].label;
    return {
      id: actionId,
      intent: "quest.create",
      title: quest.title ?? "새 Quest",
      summary: `공주님, '${quest.title ?? "이 일"}'을(를) ${typeLabel} 퀘스트로 등록해드릴까요? 처리하시기 편한 시간을 알려주시면 그에 맞춰 챙겨드릴게요.`,
      confirmLabel: "Quest 생성",
      payload: {
        quest: {
          title: quest.title ?? "새 Quest",
          description: "세린이 대화에서 정리한 Quest입니다.",
          type: questType,
          priority: "medium",
          progress: 0,
          expReward: questTypeMeta[questType].baseExp,
          goldReward: 0,
          dueDate: quest.dueDate ?? getKoreanToday(),
          rewardClaimed: false,
          source: "serin",
        },
      },
      logEntries: [{ domain: "quest", label: quest.title ?? "새 Quest", detail: `${typeLabel} Quest 생성` }],
    };
  }

  if (parsedIntent.intent === "quest.update") {
    const questTitle = parsedIntent.entities.questTitle as string;
    const questId = parsedIntent.entities.questId as string;
    return {
      id: actionId,
      intent: "quest.update",
      title: questTitle,
      summary: `공주님, '${questTitle}' 퀘스트 내용을 방금 말씀대로 수정해드릴까요?`,
      confirmLabel: "Quest 수정",
      payload: {
        questUpdate: { questId, changes: {} },
      },
      logEntries: [{ domain: "quest", label: questTitle, detail: "내용 수정" }],
    };
  }

  if (parsedIntent.intent === "quest.delete") {
    const questTitle = (parsedIntent.entities.questTitle as string) ?? "가장 최근 Quest";
    const questId = parsedIntent.entities.questId as string;
    return {
      id: actionId,
      intent: "quest.delete",
      title: questTitle,
      summary: `공주님, '${questTitle}'을(를) 삭제해드릴까요?`,
      confirmLabel: "Quest 삭제",
      payload: {
        questDelete: { questId },
      },
      logEntries: [{ domain: "quest", label: questTitle, detail: "삭제" }],
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
      logEntries: [{ domain: "diary", label: "오늘의 다이어리", detail: "초안 생성" }],
    };
  }

  if (parsedIntent.intent === "diary.update") {
    const targetDate = parsedIntent.entities.targetDate as string;
    return {
      id: actionId,
      intent: "diary.update",
      title: targetDate === "yesterday" ? "어제 일기" : "오늘 일기",
      summary: `공주님, ${targetDate === "yesterday" ? "어제" : "오늘"} 일기를 침실에서 이어서 수정하실 수 있게 열어드릴까요?`,
      confirmLabel: "침실에서 수정",
      payload: {
        diaryEdit: { entryId: targetDate },
      },
      logEntries: [{ domain: "diary", label: targetDate === "yesterday" ? "어제 일기" : "오늘 일기", detail: "수정 모드 진입" }],
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
      logEntries: [{ domain: "relationship", label: "새 연락처", detail: "인연록에 저장" }],
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
