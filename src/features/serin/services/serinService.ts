import { executeIntent } from "./serinActionExecutor";
import { parseIntent } from "./serinIntentParser";
import type { SerinExecutionResult, SerinServiceMessageInput } from "../types/serin.types";

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

export async function streamSerinResponse(_input: SerinServiceMessageInput) {
  // TODO: Replace mock response with actual AI API call
  return "공주님, 요청을 분석했습니다. 필요한 경우 확인 카드를 준비하겠습니다.";
}

export async function sendMessage(input: SerinServiceMessageInput): Promise<SerinExecutionResult> {
  // TODO: Replace mock response with actual AI API call
  const parsed = parseIntent(input.content, input.attachments);
  const action = parsed.needsConfirmation ? executeIntent(parsed) : null;

  if (parsed.intent === "memory.save") {
    return {
      action: null,
      reply: "기억해둘게요, 공주님. 다음 추천부터 이 내용을 반영하겠습니다.",
      status: "speaking",
    };
  }

  if (action) {
    return {
      action,
      reply: `${action.title} 요청을 확인했습니다. 바로 실행하기 전에 공주님의 확인을 받을게요.`,
      status: "speaking",
    };
  }

  return {
    action: null,
    reply: "공주님, 오늘의 Quest와 일정을 기준으로 흐름을 다시 정리해두겠습니다.",
    status: "speaking",
  };
}
