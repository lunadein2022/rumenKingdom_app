import { addDays, getKoreanToday } from "../../../app/dateUtils";
import { parseCalendarIntent } from "../../calendar/services/calendarIntentParser";
import type { SerinAttachment, SerinParsedIntent, SerinTitledRef } from "../types/serin.types";

function hasAny(message: string, words: string[]) {
  return words.some((word) => message.includes(word));
}

function normalize(message: string) {
  return message.trim().replace(/\s+/g, " ");
}

function stripCommandWords(message: string) {
  return normalize(message)
    .replace(/오늘|내일|모레|이번\s*주|다음\s*주|이번\s*달|다음\s*달/g, "")
    .replace(/\d{1,2}\s*월\s*\d{1,2}\s*일|\d{1,2}\s*시|[일월화수목금토]요일/g, "")
    .replace(/퀘스트|할\s?일|todo|task|일정|캘린더|프로젝트|메인\s?퀘스트/g, "")
    .replace(/추가해줘|추가|등록해줘|등록|넣어줘|넣어|만들어줘|만들어|삭제해줘|삭제|지워줘|지워|수정해줘|수정|바꿔줘|변경해줘|완료해줘|완료/g, "")
    .replace(/해야\s*(해|돼|겠다|겠어)?|부탁해|좀/g, "")
    .replace(/\s+/g, " ")
    .trim() || "새 요청";
}

function corePhrase(title: string) {
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return title;
  return words.slice(0, -1).join(" ");
}

function findTitledRef(message: string, refs: SerinTitledRef[]): SerinTitledRef | null {
  const normalized = normalize(message);
  return refs.find((ref) => normalized.includes(ref.title) || normalized.includes(corePhrase(ref.title))) ?? null;
}

function isConversation(message: string) {
  return (
    /(갔었|했었|먹었|봤었|다녀왔|였어|이었다|좋았어|힘들었어|기억나|생각나)/.test(message) ||
    /(고민이야|해야\s*하는데|할까\s*말까|어쩌지|모르겠어|하면\s*좋을까|해야\s*되나)/.test(message) ||
    /(기분|우울|외로|행복|좋아|싫어|힘들|피곤|보고\s*싶|사랑|고마워|속상|답답)/.test(message) ||
    /(어때|괜찮을까|가능할까|뭐\s*같아|추천해줘|이야기해줘)/.test(message)
  );
}

function isQuestionOnly(message: string) {
  return /(뭐\s*있|뭐야|알려줘|확인해줘|있어\??|있나요|있니|어때|괜찮을까|가능할까|일정\s*있|할\s*일\s*뭐)/.test(message);
}

function isMemorySave(message: string) {
  return /(기억해줘|기억해|저장해줘|다음에\s*참고|앞으로|나는\s*보통|내가\s*좋아|내가\s*싫어)/.test(message);
}

function isShoppingOrNonOsAdd(message: string) {
  return /(장바구니|쇼핑백|카트|위시리스트|찜|구매목록)/.test(message);
}

function hasCreateCommand(message: string) {
  return /(추가해줘|등록해줘|넣어줘|만들어줘|잡아줘|예약해줘|생성해줘|추가|등록|넣어|만들어|잡아|예약)/.test(message);
}

function hasDeleteCommand(message: string) {
  return /(삭제해줘|삭제|지워줘|지워|취소해줘|취소|없애줘|빼줘)/.test(message);
}

function hasUpdateCommand(message: string) {
  return /(수정해줘|수정|바꿔줘|변경해줘|고쳐줘|미뤄줘|옮겨줘|상태\s*바꿔|제목\s*바꿔|이름\s*바꿔)/.test(message);
}

function hasCompleteCommand(message: string) {
  return /(완료해줘|완료|끝냈어|끝났어|했어|처리했어)/.test(message);
}

function hasDateOrTime(message: string) {
  return /(오늘|내일|모레|이번\s*주|다음\s*주|이번\s*달|다음\s*달|\d{1,2}\s*월\s*\d{1,2}\s*일|\d{1,2}\s*시|[일월화수목금토]요일|오전|오후|저녁|밤|아침|점심)/.test(message);
}

function inferDueDate(message: string) {
  if (message.includes("모레")) return addDays(getKoreanToday(), 2);
  if (message.includes("내일")) return addDays(getKoreanToday(), 1);
  return getKoreanToday();
}

function extractNewTitle(message: string) {
  const quoted = message.match(/['"“”‘’]([^'"“”‘’]+)['"“”‘’]/);
  if (quoted?.[1]) return quoted[1].trim();
  const toMatch = message.match(/(?:로|으로)\s*(.+?)(?:\s*바꿔|\s*변경|\s*수정|$)/);
  return toMatch?.[1]?.trim() ?? "";
}

export function parseIntent(
  rawMessage: string,
  attachments: SerinAttachment[] = [],
  mainQuestTitles: string[] = [],
  questRefs: SerinTitledRef[] = [],
  eventRefs: SerinTitledRef[] = [],
): SerinParsedIntent {
  const message = normalize(rawMessage);

  if (!message) {
    return { intent: "chat.general", confidence: 0.9, entities: {}, needsConfirmation: false };
  }

  if (attachments.some((attachment) => attachment.type === "image") || hasAny(message, ["명함", "연락처", "전화번호"])) {
    return {
      intent: "contact.extract",
      confidence: 0.78,
      entities: {
        contact: {
          name: "새 연락처",
          memo: "첨부 이미지 또는 대화에서 추출한 연락처입니다.",
        },
      },
      needsConfirmation: true,
    };
  }

  if (isMemorySave(message)) {
    return {
      intent: "memory.save",
      confidence: 0.84,
      entities: {
        memory: {
          memoryType: "preference",
          content: message.replace(/기억해줘|기억해|저장해줘|다음에\s*참고해줘/g, "").trim() || message,
          importance: "medium",
          source: "chat",
        },
      },
      needsConfirmation: false,
    };
  }

  if (isShoppingOrNonOsAdd(message)) {
    return { intent: "chat.general", confidence: 0.86, entities: {}, needsConfirmation: false };
  }

  const matchedEvent = findTitledRef(message, eventRefs);
  if (matchedEvent && hasDeleteCommand(message)) {
    return {
      intent: "calendar.delete",
      confidence: 0.84,
      entities: { eventId: matchedEvent.id, eventTitle: matchedEvent.title },
      needsConfirmation: true,
    };
  }
  if (matchedEvent && hasUpdateCommand(message)) {
    const draft = parseCalendarIntent(message);
    return {
      intent: "calendar.update",
      confidence: 0.82,
      entities: {
        eventId: matchedEvent.id,
        eventTitle: matchedEvent.title,
        draft,
        changes: {
          title: extractNewTitle(message) || undefined,
          startAt: draft?.startAt,
          endAt: draft?.endAt,
          isAllDay: draft?.isAllDay,
        },
      },
      needsConfirmation: true,
    };
  }

  const matchedQuest = findTitledRef(message, questRefs);
  if (matchedQuest && hasDeleteCommand(message)) {
    return {
      intent: "quest.delete",
      confidence: 0.84,
      entities: { questId: matchedQuest.id, questTitle: matchedQuest.title },
      needsConfirmation: true,
    };
  }
  if (matchedQuest && hasCompleteCommand(message)) {
    return {
      intent: "quest.complete",
      confidence: 0.82,
      entities: { questId: matchedQuest.id, questTitle: matchedQuest.title },
      needsConfirmation: true,
    };
  }
  if (matchedQuest && hasUpdateCommand(message)) {
    return {
      intent: "quest.update",
      confidence: 0.8,
      entities: {
        questId: matchedQuest.id,
        questTitle: matchedQuest.title,
        changes: {
          title: extractNewTitle(message) || undefined,
          dueDate: hasDateOrTime(message) ? inferDueDate(message) : undefined,
          description: message,
        },
      },
      needsConfirmation: true,
    };
  }

  if (/방금.{0,6}(등록한|만든|추가한).{0,8}(퀘스트|quest|할\s?일|todo)/i.test(message) && hasDeleteCommand(message)) {
    return {
      intent: "quest.delete",
      confidence: 0.74,
      entities: { questId: "__last__", questTitle: "가장 최근 Quest" },
      needsConfirmation: true,
    };
  }

  const matchedProjectTitle = mainQuestTitles.find(
    (title) => message.includes(title) || message.includes(corePhrase(title)),
  );
  if (matchedProjectTitle) {
    if (hasUpdateCommand(message) && /(이름|제목)/.test(message)) {
      return {
        intent: "project.rename",
        confidence: 0.78,
        entities: { mainQuestTitle: matchedProjectTitle, newTitle: extractNewTitle(message) },
        needsConfirmation: true,
      };
    }
    if (hasUpdateCommand(message) || hasCompleteCommand(message) || /(진행|업데이트|작업|시작)/.test(message)) {
      return {
        intent: "project.update",
        confidence: 0.82,
        entities: { mainQuestTitle: matchedProjectTitle, content: message },
        needsConfirmation: true,
      };
    }
  }

  if (!isQuestionOnly(message)) {
    const calendarIntent = parseCalendarIntent(message);
    if (calendarIntent) {
      return {
        intent: "calendar.create",
        confidence: calendarIntent.confidence,
        entities: { calendar: calendarIntent },
        needsConfirmation: true,
      };
    }
  }

  if (
    hasCreateCommand(message) &&
    /(프로젝트|메인\s?퀘스트|장기\s?프로젝트)/.test(message) &&
    !isConversation(message)
  ) {
    return {
      intent: "project.create",
      confidence: 0.8,
      entities: { title: stripCommandWords(message) },
      needsConfirmation: true,
    };
  }

  if (
    !isConversation(message) &&
    !isQuestionOnly(message) &&
    (
      /(퀘스트|할\s?일|todo|task|체크리스트)/i.test(message) ||
      /(해야\s*해|해야\s*돼|보내야|정리해야|준비해야|연락해야|챙겨야)/.test(message)
    )
  ) {
    const type = /(서브|side)/i.test(message) ? "side" : "daily";
    return {
      intent: "quest.create",
      confidence: 0.78,
      entities: {
        quest: {
          type,
          title: stripCommandWords(message),
          dueDate: inferDueDate(message),
        },
      },
      needsConfirmation: true,
    };
  }

  if (hasAny(message, ["일기", "다이어리", "회고", "요약"])) {
    if (hasUpdateCommand(message) || /(고칠|바꿀)/.test(message)) {
      return {
        intent: "diary.update",
        confidence: 0.74,
        entities: { targetDate: message.includes("어제") ? "yesterday" : "today" },
        needsConfirmation: true,
      };
    }
    return {
      intent: message.includes("요약") ? "diary.summarize" : "diary.create",
      confidence: 0.72,
      entities: {
        diary: {
          title: "오늘의 공주 다이어리",
          content: "오늘 일정과 완료한 Quest를 바탕으로 다이어리 초안을 준비합니다.",
        },
      },
      needsConfirmation: true,
    };
  }

  if (hasAny(message, ["찾아줘", "검색해줘", "검색", "어디야", "언제였", "찾아봐"])) {
    return {
      intent: "library.search",
      confidence: 0.7,
      entities: { query: message },
      needsConfirmation: false,
    };
  }

  return {
    intent: "chat.general",
    confidence: 0.88,
    entities: {},
    needsConfirmation: false,
  };
}
