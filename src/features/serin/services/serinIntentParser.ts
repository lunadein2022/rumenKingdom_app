import { addDays, getKoreanToday } from "../../../app/dateUtils";
import { parseCalendarIntent } from "../../calendar/services/calendarIntentParser";
import type { SerinAttachment, SerinParsedIntent, SerinTitledRef } from "../types/serin.types";

function hasAny(message: string, words: string[]) {
  return words.some((word) => message.includes(word));
}

function extractTitle(message: string) {
  return message
    .replace(
      /내일|오늘|모레|다음주|까지|퀘스트|할\s?일|todo|task|일정|만들어줘|생성해줘|추가해줘|등록해줘|기억해줘|저장해줘|해야\s?(겠다|겠어|돼요|돼|되지|되|해요|해|함)?|부탁해|부탁|줄래/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .trim() || "새 요청";
}

// 저장된 프로젝트 제목("Hydro Hawk CES 준비")을 대화 속 자연스러운 언급
// ("Hydro Hawk 프로젝트에 ...")과도 매칭시키기 위해, 마지막 낱말(보통
// 준비/개발/제작 같은 서술어)을 뺀 핵심 구절을 뽑아냅니다.
function corePhrase(title: string) {
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return title;
  return words.slice(0, -1).join(" ");
}

function findTitledRef(message: string, refs: SerinTitledRef[]): SerinTitledRef | null {
  for (const ref of refs) {
    if (message.includes(ref.title)) return ref;
  }
  return null;
}

// 세린은 사용자의 말을 곧바로 등록하지 않고, 순서대로 의도를 확인합니다:
// 감정/잡담(먼저 걸러냄) → Calendar(날짜/시간/기간) → Project(메인퀘스트) 이름
// 변경/업데이트 → Quest 수정/삭제 → 단순 업무(Daily Quest) → 기억/루틴 →
// Diary → 인연 → 검색 → 그 외 일반 대화. mainQuestTitles/questRefs/eventRefs를
// 넘기면, 이미 있는 항목을 언급했을 때 새로 만들지 않고 수정/삭제로 분류합니다.
export function parseIntent(
  message: string,
  attachments: SerinAttachment[] = [],
  mainQuestTitles: string[] = [],
  questRefs: SerinTitledRef[] = [],
  eventRefs: SerinTitledRef[] = [],
): SerinParsedIntent {
  // 0. 감정/잡담 마커. "기분 어때", "오늘 어땠어" 같은 말은 날짜/시간이 함께
  // 있지 않은 한 절대 Quest나 Calendar로 등록되지 않습니다.
  const chatMarkers = /기분\s*(이)?\s*어때|오늘\s*어땠|힘들지|피곤하지|보고\s*싶|사랑해|안녕|고마워|수고했어|심심해|외로워/;
  const hasStrongTaskSignal = /(\d{1,2}\s*시|\d{1,2}월\s*\d{1,2}일|내일|모레|다음주|일정|회의|미팅)/.test(message);
  if (chatMarkers.test(message) && !hasStrongTaskSignal) {
    return { intent: "chat.general", confidence: 0.9, entities: {}, needsConfirmation: false };
  }

  // 0.5. 명시적 퀘스트 슬롯 지정 — "메인에/서브에/일일에 추가해줘"는 사용자가
  // 계층을 직접 지정한 것이므로, 캘린더 감지보다 먼저 그대로 따릅니다.
  if (hasAny(message, ["추가해", "만들어", "등록해", "넣어"])) {
    if (/메인\s?(퀘스트)?(에|으로|로)/.test(message)) {
      return {
        intent: "project.create",
        confidence: 0.86,
        entities: { title: extractTitle(message.replace(/메인\s?(퀘스트)?(에|으로|로)?/g, " ")) },
        needsConfirmation: true,
      };
    }
    const slotMatch = message.match(/(서브|일일)\s?(퀘스트)?(에|으로|로)/);
    if (slotMatch) {
      return {
        intent: "quest.create",
        confidence: 0.86,
        entities: {
          quest: {
            type: slotMatch[1] === "서브" ? "side" : "daily",
            title: extractTitle(message.replace(/(서브|일일)\s?(퀘스트)?(에|으로|로)?/g, " ")),
            dueDate: message.includes("내일") ? addDays(getKoreanToday(), 1) : getKoreanToday(),
          },
        },
        needsConfirmation: true,
      };
    }
  }

  // 1. Calendar — 날짜/시간/기간이 있으면 최우선입니다. 기간 표현
  // ("8월 19일부터 3일간")도 여기서 함께 처리됩니다.
  const calendarIntent = parseCalendarIntent(message);
  if (calendarIntent) {
    // "변경/수정/미뤄/바꿔"가 함께 있고 기존 일정 제목이 언급되면 새 일정이
    // 아니라 기존 일정 수정으로 분류합니다.
    const matchedEvent = findTitledRef(message, eventRefs);
    if (matchedEvent && hasAny(message, ["변경", "수정", "미뤄", "바꿔", "옮겨"])) {
      return {
        intent: "calendar.update",
        confidence: 0.82,
        entities: { eventId: matchedEvent.id, eventTitle: matchedEvent.title, draft: calendarIntent },
        needsConfirmation: true,
      };
    }
    return {
      intent: "calendar.create",
      confidence: calendarIntent.confidence,
      entities: { calendar: calendarIntent },
      needsConfirmation: true,
    };
  }

  // 일정 삭제/취소는 날짜 표현이 없어도 감지합니다.
  if (hasAny(message, ["일정 취소", "일정 삭제", "일정 지워"])) {
    const matchedEvent = findTitledRef(message, eventRefs);
    if (matchedEvent) {
      return {
        intent: "calendar.delete",
        confidence: 0.8,
        entities: { eventId: matchedEvent.id, eventTitle: matchedEvent.title },
        needsConfirmation: true,
      };
    }
  }

  // 2. Project(메인퀘스트) — 이미 있는 프로젝트가 언급되면 이름 변경인지
  // 진행 업데이트인지를 구분합니다.
  const matchedProjectTitle = mainQuestTitles.find(
    (title) => message.includes(title) || message.includes(corePhrase(title)),
  );
  if (matchedProjectTitle) {
    if (hasAny(message, ["이름 바꿔", "이름을", "이름 변경", "제목 바꿔", "제목 변경"])) {
      const newTitleMatch = message.match(/(?:이름을|제목을)?\s*['"“]?([^'"”]+?)['"”]?\s*(?:으로|로)\s*(?:바꿔|변경)/);
      return {
        intent: "project.rename",
        confidence: 0.78,
        entities: { mainQuestTitle: matchedProjectTitle, newTitle: newTitleMatch?.[1]?.trim() ?? "" },
        needsConfirmation: true,
      };
    }
    if (hasAny(message, ["완료", "진행", "업데이트", "끝냈", "마쳤", "시작했", "수정 완료"])) {
      return {
        intent: "project.update",
        confidence: 0.82,
        entities: { mainQuestTitle: matchedProjectTitle, content: message },
        needsConfirmation: true,
      };
    }
  }

  // "메인에 추가해줘 / 메인 퀘스트로 만들어줘" — 메인 퀘스트(=프로젝트) 생성.
  if (
    hasAny(message, ["프로젝트 시작", "새 프로젝트", "프로젝트를 시작", "메인퀘스트 시작"]) ||
    (/메인/.test(message) && hasAny(message, ["추가해", "만들어", "등록해", "넣어"]))
  ) {
    return {
      intent: "project.create",
      confidence: 0.78,
      entities: { title: extractTitle(message.replace(/메인\s?(퀘스트)?(에|으로|로)?/g, " ")) },
      needsConfirmation: true,
    };
  }

  // 3. Quest 수정/삭제 — 이미 있는 Quest가 언급되면 수정/삭제로 분류합니다.
  const matchedQuest = findTitledRef(message, questRefs);
  if (matchedQuest && hasAny(message, ["삭제해줘", "지워줘", "취소해줘", "삭제할래"])) {
    return {
      intent: "quest.delete",
      confidence: 0.8,
      entities: { questId: matchedQuest.id, questTitle: matchedQuest.title },
      needsConfirmation: true,
    };
  }
  if (/방금.{0,4}(등록한|만든|추가한).{0,6}(퀘스트|quest|할\s?일|todo)/i.test(message) && hasAny(message, ["삭제", "지워", "취소"])) {
    return {
      intent: "quest.delete",
      confidence: 0.72,
      entities: { questId: "__last__" },
      needsConfirmation: true,
    };
  }
  if (matchedQuest && hasAny(message, ["변경", "수정", "미뤄", "바꿔"])) {
    return {
      intent: "quest.update",
      confidence: 0.76,
      entities: { questId: matchedQuest.id, questTitle: matchedQuest.title, note: message },
      needsConfirmation: true,
    };
  }

  // 4. 명함/연락처 (첨부 이미지 우선)
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

  // 5. 기억/루틴 — "기억해줘", "앞으로", "나는 보통", "루틴" 등.
  if (hasAny(message, ["기억해", "기억해줘", "잊지 마", "저장해줘", "앞으로", "나는 보통", "나는 오전에", "루틴으로"])) {
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

  // 6. 실행형 업무 → 일일/서브 Quest. "서브에 추가해줘"는 서브, "일일에 추가해줘"
  // 또는 일반 실행형("~해야 돼")은 일일로 라우팅합니다.
  if (
    hasAny(message, ["해야", "보내야", "정리해야", "준비해야", "연락해야", "챙겨야", "할 일", "할일", "todo", "task", "체크리스트"]) ||
    (/(서브|일일)/.test(message) && hasAny(message, ["추가해", "만들어", "등록해", "넣어"]))
  ) {
    const type = /서브/.test(message) ? "side" : "daily";
    return {
      intent: "quest.create",
      confidence: 0.76,
      entities: {
        quest: {
          type,
          title: extractTitle(message.replace(/(서브|일일)\s?(퀘스트)?(에|으로|로)?/g, " ")),
          dueDate: message.includes("내일") ? addDays(getKoreanToday(), 1) : getKoreanToday(),
        },
      },
      needsConfirmation: true,
    };
  }

  // 7. Diary — 수정("어제 일기 수정할게")과 신규 작성/요약을 구분합니다.
  if (hasAny(message, ["일기", "다이어리", "회고", "요약"])) {
    if (hasAny(message, ["수정", "고칠래", "바꿀래"])) {
      return {
        intent: "diary.update",
        confidence: 0.74,
        entities: {
          targetDate: message.includes("어제") ? "yesterday" : "today",
        },
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

  // 8. 검색
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
