import type { CalendarEventInput, CalendarIntentDraft, Quest } from "../../../app/types";
import { getKoreanToday } from "../../../app/dateUtils";
import { questTypeMeta } from "../../../domain/questDomain";
import type { SerinAction, SerinParsedIntent } from "../types/serin.types";

export function confirmAction(action: SerinAction): SerinAction {
  return action;
}

export function cancelAction(action: SerinAction): SerinAction {
  return action;
}

function compactCalendarChanges(changes: Partial<CalendarEventInput>): Partial<CalendarEventInput> {
  return Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined && value !== ""),
  ) as Partial<CalendarEventInput>;
}

function compactQuestChanges(changes: Partial<Quest>): Partial<Quest> {
  return Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined && value !== ""),
  ) as Partial<Quest>;
}

export function executeIntent(parsedIntent: SerinParsedIntent): SerinAction | null {
  const actionId = `serin-action-${Date.now()}`;

  if (parsedIntent.intent === "calendar.create") {
    const draft = parsedIntent.entities.calendar as CalendarIntentDraft;
    const when = draft.isMultiDay ? draft.confirmSummary ?? draft.title : draft.startAt.slice(0, 16).replace("T", " ");
    return {
      id: actionId,
      intent: "calendar.create",
      title: draft.title,
      summary: `공주님, '${draft.title}' 일정을 ${when}에 등록해드릴까요?`,
      confirmLabel: "일정 추가",
      secondaryLabel: draft.isMultiDay ? undefined : "Quest로 만들기",
      payload: {
        calendar: {
          title: draft.title,
          description: `세린이 "${draft.sourceMessage}" 말씀에서 정리한 일정입니다.`,
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
      logEntries: [{ domain: "calendar", label: draft.title, detail: "일정 생성" }],
    };
  }

  if (parsedIntent.intent === "calendar.update") {
    const eventTitle = parsedIntent.entities.eventTitle as string;
    const eventId = parsedIntent.entities.eventId as string;
    const draft = parsedIntent.entities.draft as CalendarIntentDraft | null;
    const rawChanges = parsedIntent.entities.changes as Partial<CalendarEventInput> | undefined;
    const changes = compactCalendarChanges({
      ...(rawChanges ?? {}),
      startAt: rawChanges?.startAt ?? draft?.startAt,
      endAt: rawChanges?.endAt ?? draft?.endAt,
      isAllDay: rawChanges?.isAllDay ?? draft?.isAllDay,
    });
    return {
      id: actionId,
      intent: "calendar.update",
      title: eventTitle,
      summary: `공주님, '${eventTitle}' 일정을 말씀하신 내용으로 수정해드릴까요?`,
      confirmLabel: "일정 수정",
      payload: { calendarUpdate: { eventId, changes } },
      logEntries: [{ domain: "calendar", label: eventTitle, detail: "일정 수정" }],
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
      confirmLabel: "일정 삭제",
      payload: { calendarDelete: { eventId } },
      logEntries: [{ domain: "calendar", label: eventTitle, detail: "일정 삭제" }],
    };
  }

  if (parsedIntent.intent === "project.create") {
    const title = parsedIntent.entities.title as string;
    return {
      id: actionId,
      intent: "project.create",
      title,
      summary: `공주님, '${title}'을 메인 Quest 프로젝트로 집무실에 등록해드릴까요?`,
      confirmLabel: "프로젝트 생성",
      payload: { mainQuest: { title } },
      logEntries: [{ domain: "project", label: title, detail: "메인 Quest 생성" }],
    };
  }

  if (parsedIntent.intent === "project.update") {
    const mainQuestTitle = parsedIntent.entities.mainQuestTitle as string;
    const content = parsedIntent.entities.content as string;
    return {
      id: actionId,
      intent: "project.update",
      title: mainQuestTitle,
      summary: `공주님, '${mainQuestTitle}' 프로젝트에 업데이트 로그를 남겨둘까요?`,
      confirmLabel: "업데이트 기록",
      payload: { mainQuestUpdate: { mainQuestId: mainQuestTitle, content } },
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
      summary: `공주님, '${mainQuestTitle}'의 이름을 '${newTitle}'로 바꿔드릴까요?`,
      confirmLabel: "이름 변경",
      payload: { mainQuestRename: { mainQuestId: mainQuestTitle, newTitle } },
      logEntries: [{ domain: "project", label: mainQuestTitle, detail: `이름을 '${newTitle}'로 변경` }],
    };
  }

  if (parsedIntent.intent === "quest.create") {
    const title = parsedIntent.entities.title as string;
    const dueDate = (parsedIntent.entities.dueDate as string | undefined) ?? getKoreanToday();
    return {
      id: actionId,
      intent: "quest.create",
      title,
      summary: `공주님, '${title}'을 Quest로 등록해드릴까요?`,
      confirmLabel: "Quest 추가",
      payload: {
        quest: {
          title,
          description: "세린이 대화에서 정리한 Quest입니다.",
          type: "daily",
          category: "work",
          priority: "medium",
          status: "pending",
          progress: 0,
          dueDate,
          expReward: questTypeMeta.daily.baseExp,
          goldReward: 0,
          rewardClaimed: false,
          source: "serin",
        },
      },
      logEntries: [{ domain: "quest", label: title, detail: "Quest 생성" }],
    };
  }

  if (parsedIntent.intent === "quest.update") {
    const questTitle = parsedIntent.entities.questTitle as string;
    const questId = parsedIntent.entities.questId as string;
    const changes = compactQuestChanges(parsedIntent.entities.changes as Partial<Quest>);
    return {
      id: actionId,
      intent: "quest.update",
      title: questTitle,
      summary: `공주님, '${questTitle}' Quest를 말씀하신 내용으로 수정해드릴까요?`,
      confirmLabel: "Quest 수정",
      payload: { questUpdate: { questId, changes } },
      logEntries: [{ domain: "quest", label: questTitle, detail: "Quest 수정" }],
    };
  }

  if (parsedIntent.intent === "quest.complete") {
    const questTitle = parsedIntent.entities.questTitle as string;
    const questId = parsedIntent.entities.questId as string;
    return {
      id: actionId,
      intent: "quest.complete",
      title: questTitle,
      summary: `공주님, '${questTitle}' Quest를 완료 처리해드릴까요?`,
      confirmLabel: "완료 처리",
      payload: { questUpdate: { questId, changes: { status: "completed", progress: 100 } } },
      logEntries: [{ domain: "quest", label: questTitle, detail: "Quest 완료" }],
    };
  }

  if (parsedIntent.intent === "quest.delete") {
    const questTitle = parsedIntent.entities.questTitle as string;
    const questId = parsedIntent.entities.questId as string;
    return {
      id: actionId,
      intent: "quest.delete",
      title: questTitle,
      summary: `공주님, '${questTitle}' Quest를 삭제해드릴까요?`,
      confirmLabel: "Quest 삭제",
      payload: { questDelete: { questId } },
      logEntries: [{ domain: "quest", label: questTitle, detail: "Quest 삭제" }],
    };
  }

  if (parsedIntent.intent === "memory.save") {
    const content = parsedIntent.entities.content as string;
    return {
      id: actionId,
      intent: "memory.save",
      title: "세린 기억",
      summary: `공주님, 이 내용을 세린의 장기 기억에 저장해둘까요?\n"${content}"`,
      confirmLabel: "기억 저장",
      payload: {
        memory: {
          memoryType: "preference",
          content,
          importance: "medium",
          source: "confirmation",
        },
      },
      logEntries: [{ domain: "memory", label: "세린 기억", detail: content }],
    };
  }

  if (parsedIntent.intent === "diary.create") {
    const title = (parsedIntent.entities.title as string | undefined) ?? "오늘의 일기";
    const content = (parsedIntent.entities.content as string | undefined) ?? "";
    return {
      id: actionId,
      intent: "diary.create",
      title,
      summary: `공주님, 침실 다이어리에 '${title}' 초안을 적어둘까요?`,
      confirmLabel: "다이어리 저장",
      payload: { diary: { title, content } },
      logEntries: [{ domain: "diary", label: title, detail: "다이어리 초안 생성" }],
    };
  }

  if (parsedIntent.intent === "diary.update") {
    const entryId = parsedIntent.entities.entryId as string;
    return {
      id: actionId,
      intent: "diary.update",
      title: "다이어리 수정",
      summary: "공주님, 해당 다이어리를 침실에서 수정하실 수 있게 열어둘까요?",
      confirmLabel: "다이어리 열기",
      payload: { diaryEdit: { entryId } },
      logEntries: [{ domain: "diary", label: "다이어리", detail: "수정 화면 열기" }],
    };
  }

  if (parsedIntent.intent === "library.search") {
    const keyword = (parsedIntent.entities.keyword as string | undefined) ?? "";
    return {
      id: actionId,
      intent: "library.search",
      title: keyword || "왕국도서관 검색",
      summary: `공주님, 왕국도서관에서 '${keyword}' 기록을 찾아볼까요?`,
      confirmLabel: "도서관 검색",
      payload: {},
      logEntries: [{ domain: "library", label: keyword || "검색", detail: "기록 검색" }],
    };
  }

  return null;
}
