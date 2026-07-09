import { executeIntent } from "./serinActionExecutor";
import { parseIntent } from "./serinIntentParser";
import type { SerinExecutionResult, SerinIntent, SerinServiceMessageInput } from "../types/serin.types";

const fallbackReplies: Record<SerinIntent, string[]> = {
  "chat.general": [
    "공주님, 지금은 세린의 궁정 통신이 잠시 불안정합니다. 그래도 요청은 들었습니다. 우선 핵심부터 정리해드릴게요.",
    "연결이 잠시 흔들렸습니다. 제가 임시로 판단해보면, 지금 요청은 일정, Quest, 기록 중 어디에 연결할지 먼저 정하면 좋겠습니다.",
  ],
  "quest.create": ["Quest로 만들 수 있는 요청입니다. 확인해주시면 Princess OS에 반영하겠습니다."],
  "quest.update": ["기존 Quest를 수정할 수 있는 요청입니다. 대상 Quest가 연결되면 바로 반영하겠습니다."],
  "quest.complete": ["완료 처리 전 보상, 기록, 성장 반영 순서를 확인하겠습니다."],
  "calendar.create": ["일정으로 등록할 수 있는 요청입니다. 확인해주시면 Calendar에 반영하겠습니다."],
  "calendar.update": ["일정 수정 요청으로 이해했습니다. 대상 일정이 연결되면 반영하겠습니다."],
  "calendar.delete": ["일정 취소 요청으로 이해했습니다. 삭제 전에 한 번 더 확인하겠습니다."],
  "diary.create": ["오늘의 기록으로 남길 수 있는 내용입니다. 다이어리 초안으로 정리하겠습니다."],
  "diary.summarize": ["기록을 요약할 수 있습니다. 관련 일정과 Quest를 함께 묶어보겠습니다."],
  "contact.extract": ["연락처로 저장할 수 있는 정보입니다. 확인 후 인연록에 반영하겠습니다."],
  "contact.create": ["인연록에 저장할 수 있는 사람 정보로 보입니다."],
  "memory.save": ["기억해두겠습니다, 공주님. 다음 추천과 대화에 반영할 수 있도록 표시하겠습니다."],
  "memory.search": ["기억 속에서 관련 기록을 찾아보겠습니다."],
  "library.search": ["왕국 도서관에서 관련 기록을 찾아볼 수 있습니다."],
  "room.navigate": ["이동할 방을 확인했습니다. 왕성 구조와 연결하겠습니다."],
  "reward.claim": ["받을 수 있는 보상과 칭호를 확인해보겠습니다."],
  unknown: ["공주님, 요청을 조금 더 구체적으로 말해주시면 Quest, Calendar, Library 중 알맞은 곳에 연결하겠습니다."],
};

function pickFallbackReply(intent: SerinIntent, seed: string) {
  const replies = fallbackReplies[intent] ?? fallbackReplies.unknown;
  return replies[Math.abs(seed.length + intent.length) % replies.length];
}

export function fallbackSerinResponse(input: SerinServiceMessageInput): SerinExecutionResult {
  const parsed = parseIntent(input.content, input.attachments);
  const action = parsed.needsConfirmation ? executeIntent(parsed) : null;
  const reply = pickFallbackReply(parsed.intent, input.content);

  return {
    action,
    reply: action ? `${reply} 바로 실행하지 않고 공주님의 확인을 먼저 받겠습니다.` : reply,
    status: "speaking",
  };
}

async function requestSerinApi(input: SerinServiceMessageInput) {
  const response = await fetch("/.netlify/functions/serin-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: input.content,
      conversationId: input.conversationId,
      attachments: input.attachments ?? [],
    }),
  });

  if (!response.ok) {
    throw new Error(`Serin API failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data?.reply || typeof data.reply !== "string") {
    throw new Error("Serin API returned an empty reply");
  }

  return data.reply;
}

export async function getOrCreateConversation(_userId: string) {
  // TODO: Replace with Supabase Query
  return { id: "serin-conversation-default", title: "세린과 대화" };
}

export async function getMessages(_conversationId: string) {
  // TODO: Replace with Supabase Query
  return [];
}

export async function saveMessage(_message: unknown) {
  // TODO: Replace with Supabase Query
  return true;
}

export async function streamSerinResponse(input: SerinServiceMessageInput) {
  // TODO: Replace with streaming Supabase Edge Function or Netlify streaming endpoint.
  return requestSerinApi(input);
}

export async function sendMessage(input: SerinServiceMessageInput): Promise<SerinExecutionResult> {
  const parsed = parseIntent(input.content, input.attachments);
  const action = parsed.needsConfirmation ? executeIntent(parsed) : null;

  try {
    const reply = await requestSerinApi(input);
    return {
      action,
      reply,
      status: "speaking",
    };
  } catch (error) {
    console.error(error);
    return fallbackSerinResponse(input);
  }
}
