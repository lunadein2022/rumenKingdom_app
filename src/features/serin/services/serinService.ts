import { executeIntent } from "./serinActionExecutor";
import { parseIntent } from "./serinIntentParser";
import type { SerinExecutionResult, SerinIntent, SerinParsedIntent, SerinServiceMessageInput } from "../types/serin.types";

const fallbackReplies: Record<SerinIntent, string[]> = {
  "chat.general": [
    "네, 공주님. 말씀해주신 내용을 차분히 정리해보겠습니다.",
    "알겠습니다, 공주님. 필요한 일이 있으면 일정이나 Quest로 이어서 챙겨드릴게요.",
  ],
  "quest.create": ["네, 공주님. 이 일은 Quest로 등록하면 좋겠습니다. 아래 확인 버튼을 눌러주시면 바로 정리해두겠습니다."],
  "calendar.create": ["네, 공주님. 일정으로 등록할 수 있습니다. 아래 확인 버튼을 눌러주시면 캘린더에 넣어두겠습니다."],
  "memory.save": ["기억해둘게요, 공주님. 다음에 제가 곁에서 참고하겠습니다."],
  "diary.create": ["오늘의 기록으로 남길 수 있겠습니다, 공주님."],
  "diary.summarize": ["기록을 다정하게 요약해드리겠습니다, 공주님."],
  "contact.extract": ["인연록에 남길 수 있는 정보로 보입니다, 공주님."],
  "contact.create": ["인연록에 정리해둘 수 있겠습니다, 공주님."],
  "library.search": ["왕국 도서관에서 관련 기록을 찾아보겠습니다, 공주님."],
  "memory.search": ["제 기억 속에서 관련 내용을 살펴보겠습니다, 공주님."],
  "quest.update": ["Quest 수정으로 이어질 수 있겠습니다, 공주님."],
  "quest.complete": ["완료 처리로 이어질 수 있겠습니다, 공주님."],
  "calendar.update": ["일정 수정으로 이어질 수 있겠습니다, 공주님."],
  "calendar.delete": ["일정 취소로 이어질 수 있겠습니다, 공주님."],
  "room.navigate": ["이동하실 방을 확인했습니다, 공주님."],
  "reward.claim": ["보상과 칭호를 살펴보겠습니다, 공주님."],
  unknown: ["죄송합니다, 공주님. 제가 방금 말씀을 제대로 이해하지 못했어요. 조금만 더 알려주시면 바로 도와드리겠습니다."],
};

function shouldCreateAction(parsed: SerinParsedIntent) {
  return parsed.intent === "calendar.create" || parsed.intent === "quest.create" || parsed.intent === "memory.save" || parsed.needsConfirmation;
}

function pickFallbackReply(intent: SerinIntent, seed: string) {
  const replies = fallbackReplies[intent] ?? fallbackReplies.unknown;
  return replies[Math.abs(seed.length + intent.length) % replies.length];
}

export function fallbackSerinResponse(input: SerinServiceMessageInput): SerinExecutionResult {
  const parsed = parseIntent(input.content, input.attachments);
  const action = shouldCreateAction(parsed) ? executeIntent(parsed) : null;
  return {
    action,
    reply: pickFallbackReply(parsed.intent, input.content),
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
      history: input.history ?? [],
      attachments: input.attachments ?? [],
    }),
  });

  if (!response.ok) throw new Error(`Serin API failed: ${response.status}`);
  const data = await response.json();
  if (!data?.reply || typeof data.reply !== "string") throw new Error("Serin API returned an empty reply");
  return data.reply;
}

export async function getOrCreateConversation(_userId: string) {
  // TODO: Replace with Supabase Query
  return { id: "serin-conversation-default", title: "세린과 대화" };
}

export async function getMessages(_conversationId: string) {
  // Screen chat is session-only. Do not auto-restore old chat bubbles.
  return [];
}

export async function saveMessage(_message: unknown) {
  // General chat is not persisted. Only explicit memory actions go to long-term memory.
  return true;
}

export async function streamSerinResponse(input: SerinServiceMessageInput) {
  // TODO: Replace with streaming Supabase Edge Function or Netlify streaming endpoint.
  return requestSerinApi(input);
}

export async function sendMessage(input: SerinServiceMessageInput): Promise<SerinExecutionResult> {
  const parsed = parseIntent(input.content, input.attachments);
  const action = shouldCreateAction(parsed) ? executeIntent(parsed) : null;

  try {
    const reply = await requestSerinApi(input);
    return { action, reply, status: "speaking" };
  } catch (error) {
    console.error(error);
    return fallbackSerinResponse(input);
  }
}
