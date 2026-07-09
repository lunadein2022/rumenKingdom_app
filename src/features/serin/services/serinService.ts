import { executeIntent } from "./serinActionExecutor";
import { parseIntent } from "./serinIntentParser";
import type { SerinExecutionResult, SerinIntent, SerinServiceMessageInput } from "../types/serin.types";

export interface SerinHistoryItem {
  sender: "princess" | "serin";
  content: string;
}

export async function getOrCreateConversation(_userId: string) {
  // TODO: Replace with Supabase Query
  return { id: "mock-serin-conversation", title: "세린과 대화" };
}

export async function getMessages(_conversationId: string) {
  // TODO: Replace with Supabase Query
  return [];
}

export async function saveMessage(_message: unknown) {
  // TODO: Replace with Supabase Query
  return true;
}

// 구조화된 액션(퀘스트/일정/프로젝트/다이어리/인연 등)은 로컬 파서가 감지합니다.
// 확인 카드에 필요한 정보(제목, 날짜, payload)는 여기서 결정론적으로 만들어야
// 버튼을 눌렀을 때 실제로 무엇이 등록되는지 신뢰할 수 있습니다.
function buildLocalResult(input: SerinServiceMessageInput): { intent: SerinIntent; result: SerinExecutionResult } {
  const parsed = parseIntent(
    input.content,
    input.attachments,
    input.mainQuestTitles ?? [],
    input.questRefs ?? [],
    input.eventRefs ?? [],
  );
  const action = parsed.needsConfirmation ? executeIntent(parsed) : null;

  if (parsed.intent === "memory.save") {
    return {
      intent: parsed.intent,
      result: {
        action: null,
        reply: "기억해둘게요, 공주님. 다음부터 이 내용을 참고해서 챙기겠습니다.",
        status: "speaking",
      },
    };
  }

  if (parsed.intent === "library.search") {
    return {
      intent: parsed.intent,
      result: {
        action: null,
        reply: "공주님, 그 기록은 왕국도서관에서 함께 확인해볼게요. 도서관으로 이동해서 검색해드릴까요?",
        status: "speaking",
      },
    };
  }

  if (action) {
    return { intent: parsed.intent, result: { action, reply: action.summary, status: "speaking" } };
  }

  return { intent: parsed.intent, result: { action: null, reply: pickFallbackReply(), status: "speaking" } };
}

// Netlify AI 함수 호출이 실패했을 때만 쓰이는 마지막 대비용 문장입니다. 매번 같은
// 문장이 반복되면 "AI가 대화를 이해하지 못한다"는 인상을 주므로, 여러 개 중 하나를
// 무작위로 골라 최소한의 자연스러움을 유지합니다.
const FALLBACK_REPLIES = [
  "죄송해요, 공주님. 지금 이 부분은 제가 바로 답을 드리기 어려워요. 조금만 더 구체적으로 말씀해주시면 도와드릴게요.",
  "공주님, 방금 말씀은 제가 정확히 파악하지 못했어요. Quest나 일정 관련이라면 다시 한 번 편하게 말씀해주세요.",
  "잠시 확인이 필요한 내용이에요, 공주님. 등록하실 일정이나 Quest가 있으면 말씀해주시고, 아니면 조금만 더 자세히 알려주세요.",
];

function pickFallbackReply() {
  return FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)];
}

/**
 * 세린의 실제 대화 응답. 구조화된 액션(퀘스트/일정/프로젝트/다이어리/인연 등)이
 * 감지되면 그 확인 카드 문구를 그대로 쓰고, 정말 순수 잡담(chat.general)일 때만
 * Netlify Function(/.netlify/functions/serin-chat)의 실제 Claude 응답을 사용합니다.
 * 함수 호출이 실패했을 때만 로컬 mock 문장으로 대체합니다.
 */
export async function sendMessage(
  input: SerinServiceMessageInput,
  history: SerinHistoryItem[] = [],
): Promise<SerinExecutionResult> {
  const { intent, result: localResult } = buildLocalResult(input);

  // 구조화된 의도로 이미 확정된 응답(액션이 있거나, memory.save/library.search처럼
  // 결정론적으로 답이 정해진 경우)은 AI 자유 응답으로 덮어쓰지 않습니다.
  if (localResult.action || intent !== "chat.general") {
    return localResult;
  }

  try {
    const response = await fetch("/.netlify/functions/serin-chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: input.content, history }),
    });

    if (!response.ok) throw new Error(`serin-chat ${response.status}`);
    const data = await response.json();
    if (!data?.reply || typeof data.reply !== "string") throw new Error("empty reply");

    return { action: null, reply: data.reply, status: "speaking" };
  } catch {
    // Netlify Function 미배포/API 실패 시에만 로컬 mock 응답으로 대체합니다.
    return localResult;
  }
}
