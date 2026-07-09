import { parseCalendarIntent } from "../../calendar/services/calendarIntentParser";
import type { SerinAttachment, SerinParsedIntent } from "../types/serin.types";

function hasAny(message: string, words: string[]) {
  return words.some((word) => message.includes(word));
}

function extractTitle(message: string) {
  return message
    .replace(/내일|오늘|모레|다음주|까지|퀘스트|할\s?일|todo|task|일정|만들어줘|생성해줘|추가해줘|등록해줘|기억해줘|저장해줘|해야겠다|해야돼|해야해|부탁해|부탁|줄래/gi, "")
    .replace(/\s+/g, " ")
    .trim() || "새 요청";
}

// 세린은 AI 비서로서 대화를 7가지 의도(Conversation/Calendar/Todo/Project/Diary/
// Relationship/Search)로 자동 분류합니다. mainQuestTitles를 넘기면, 이미 있는
// 프로젝트 이름이 언급될 때 project.create 대신 project.update로 분류합니다.
export function parseIntent(
  message: string,
  attachments: SerinAttachment[] = [],
  mainQuestTitles: string[] = [],
): SerinParsedIntent {
  const calendarIntent = parseCalendarIntent(message);
  if (calendarIntent) {
    return {
      intent: "calendar.create",
      confidence: calendarIntent.confidence,
      entities: { calendar: calendarIntent },
      needsConfirmation: true,
    };
  }

  const matchedProject = mainQuestTitles.find((title) => message.includes(title));
  if (matchedProject && hasAny(message, ["완료", "진행", "업데이트", "끝냈", "마쳤", "시작했"])) {
    return {
      intent: "project.update",
      confidence: 0.8,
      entities: { mainQuestTitle: matchedProject, content: message },
      needsConfirmation: true,
    };
  }

  if (hasAny(message, ["프로젝트 시작", "새 프로젝트", "프로젝트를 시작", "메인퀘스트 시작"])) {
    return {
      intent: "project.create",
      confidence: 0.78,
      entities: { title: extractTitle(message) },
      needsConfirmation: true,
    };
  }

  if (attachments.some((attachment) => attachment.type === "image") || hasAny(message, ["명함", "연락처", "전화번호"])) {
    return {
      intent: "contact.extract",
      confidence: 0.78,
      entities: {
        contact: {
          name: "새 연락처",
          memo: "첨부 이미지 또는 대화에서 추출할 연락처입니다.",
        },
      },
      needsConfirmation: true,
    };
  }

  if (hasAny(message, ["기억해", "기억해줘", "잊지 마", "저장해줘"])) {
    return {
      intent: "memory.save",
      confidence: 0.82,
      entities: {
        memory: {
          memoryType: "preference",
          content: message.replace(/기억해줘|기억해|잊지 마|저장해줘/g, "").trim() || message,
          importance: "medium",
          source: "chat",
        },
      },
      needsConfirmation: false,
    };
  }

  if (hasAny(message, ["퀘스트", "할 일", "할일", "todo", "task", "해야", "작성", "준비", "부탁", "챙겨야", "리스트", "체크리스트"])) {
    return {
      intent: "quest.create",
      confidence: 0.76,
      entities: {
        quest: {
          title: extractTitle(message),
          dueDate: message.includes("내일") ? "2026-07-10" : "2026-07-09",
        },
      },
      needsConfirmation: true,
    };
  }

  if (hasAny(message, ["일기", "다이어리", "회고", "요약"])) {
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

  if (hasAny(message, ["찾아줘", "검색해줘", "검색", "어디있", "언제였", "찾아봐"])) {
    return {
      intent: "library.search",
      confidence: 0.7,
      entities: { query: message },
      needsConfirmation: false,
    };
  }

  return {
    intent: "chat.general",
    confidence: 0.54,
    entities: {},
    needsConfirmation: false,
  };
}
