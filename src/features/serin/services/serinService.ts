import { executeIntent } from "./serinActionExecutor";
import { parseIntent } from "./serinIntentParser";
import type { SerinExecutionResult, SerinServiceMessageInput } from "../types/serin.types";

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

// 구조화된 액션(퀘스트/일정 생성 등)은 로컬 파서가 감지합니다. 확인 카드에 필요한
// 정보(제목, 날짜, payload)는 여기서 결정론적으로 만들어야 버튼을 눌렀을 때 실제로
// 무엇이 등록되는지 신뢰할 수 있습니다.
function buildLocalResult(input: SerinServiceMessageInput): SerinExecutionResult {
  const parsed = parseIntent(input.content, input.attachments);
  const action = parsed.needsConfirmation ? executeIntent(parsed) : null;

  if (parsed.intent === "memory.save") {
    return {
      action: null,
      reply: "기억해둘게요, 공주님. 다음부터 이 내용을 참고해서 챙기겠습니다.",
      status: "speaking",
    };
  }

  if (action) {
    return {
      action,
      reply: action.summary,
      status: "speaking",
    };
  }

  return {
    action: null,
    reply: "네, 공주님. 오늘의 Quest와 일정을 기준으로 흐름을 다시 정리해두겠습니다.",
    status: "speaking",
  };
}

/**
 * 세린의 실제 대화 응답. 구조화된 액션(퀘스트/일정 생성 등)이 감지되면 그 확인 카드
 * 문구를 그대로 쓰고, 일반 대화일 때만 Netlify Function(/.netlify/functions/serin-chat)의
 * 실제 Claude 응답을 사용합니다. 함수 호출이 실패했을 때만 로컬 mock 문장으로 대체합니다.
 */
export async function sendMessage(
  input: SerinServiceMessageInput,
  history: SerinHistoryItem[] = [],
): Promise<SerinExecutionResult> {
  const localResult = buildLocalResult(input);

  // 확인이 필요한 구조화된 작업(퀘스트/일정 등)은 카드 문구가 곧 실행 내용이므로
  // AI 자유 응답으로 덮어쓰지 않습니다.
  if (localResult.action) {
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
