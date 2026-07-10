import { getKoreanToday } from "../../../app/dateUtils";
import { questTypeMeta } from "../../../domain/questDomain";
import { executeIntent } from "./serinActionExecutor";
import { parseIntent } from "./serinIntentParser";
import type { SerinAction, SerinExecutionResult, SerinIntent, SerinServiceMessageInput } from "../types/serin.types";

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

// ---------------------------------------------------------------------------
// "판단은 Claude, 실행은 앱 코드" 구조.
//  - 모든 메시지는 먼저 Netlify Function(serin-chat)으로 갑니다. Claude가
//    자연어를 이해하고, 일정/퀘스트/기억이 필요하면 구조화된 액션(JSON)을
//    도구 호출로 반환합니다.
//  - 프런트는 그 구조화된 액션을 검증해 확인 카드(SerinAction)로 바꿉니다.
//    자연어를 정규식으로 다시 뜯지 않습니다.
//  - Netlify Function이 없거나(로컬 vite 단독 실행) 실패한 경우에만
//    기존 로컬 파서가 오프라인 대비용으로 동작합니다.
// ---------------------------------------------------------------------------

// serin-chat 함수가 반환하는 구조화된 액션 타입입니다.
interface RemoteCalendarAction {
  type: "calendar.create";
  title: string;
  startDate: string;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  allDay: boolean;
  category: string;
}

interface RemoteQuestAction {
  type: "quest.create";
  title: string;
  // 퀘스트 계층: daily(일일) / side(서브) / main(메인=프로젝트)
  questType?: "daily" | "side" | "main";
  dueDate: string | null;
  description: string | null;
}

interface RemoteMemoryAction {
  type: "memory.save";
  content: string;
  memoryType: string;
}

type RemoteAction = RemoteCalendarAction | RemoteQuestAction | RemoteMemoryAction;

const CALENDAR_CATEGORIES = ["work", "personal", "quest", "routine", "meeting", "serin", "rest", "event"] as const;
const MEMORY_TYPES = ["preference", "person", "routine", "goal", "constraint", "emotion", "work", "personal"] as const;

function formatKoreanDateTime(startAt: string) {
  return startAt.slice(0, 16).replace("T", " ");
}

// Claude의 구조화된 응답을 앱의 확인 카드(SerinAction)로 변환합니다.
function buildActionFromRemote(remote: RemoteAction): SerinAction | null {
  const actionId = `serin-action-${Date.now()}`;

  if (remote.type === "calendar.create") {
    const isAllDay = remote.allDay || !remote.startTime;
    const startAt = `${remote.startDate}T${remote.startTime ?? "00:00"}:00`;
    const endAt = remote.endDate
      ? `${remote.endDate}T${remote.endTime ?? "23:59"}:00`
      : remote.endTime
        ? `${remote.startDate}T${remote.endTime}:00`
        : undefined;
    const isMultiDay = Boolean(remote.endDate && remote.endDate !== remote.startDate);
    const category = (CALENDAR_CATEGORIES as readonly string[]).includes(remote.category)
      ? (remote.category as (typeof CALENDAR_CATEGORIES)[number])
      : "personal";
    return {
      id: actionId,
      intent: "calendar.create",
      title: remote.title,
      summary: isMultiDay
        ? `공주님, '${remote.title}'을(를) ${remote.startDate} ~ ${remote.endDate} 기간 일정으로 등록해드릴까요?`
        : isAllDay
          ? `공주님, '${remote.title}'을(를) ${remote.startDate} 종일 일정으로 등록해드릴까요?`
          : `공주님, '${remote.title}'을(를) ${formatKoreanDateTime(startAt)} 일정으로 등록해드릴까요? 알림도 함께 챙겨드릴게요.`,
      confirmLabel: "일정 추가",
      secondaryLabel: isMultiDay ? undefined : "Quest도 만들기",
      payload: {
        calendar: {
          title: remote.title,
          description: "세린이 대화에서 정리한 일정입니다.",
          startAt,
          endAt,
          location: "루멘 왕성",
          category,
          priority: "medium",
          isAllDay,
          reminderMinutes: isAllDay ? null : 10,
          createdBy: "serin",
        },
      },
      logEntries: [
        {
          domain: "calendar",
          label: remote.title,
          detail: isMultiDay
            ? `${remote.startDate} ~ ${remote.endDate} 등록`
            : `${formatKoreanDateTime(startAt)} 등록`,
        },
      ],
    };
  }

  if (remote.type === "quest.create") {
    // 메인 퀘스트(=프로젝트)는 Quest 모델이 아니라 MainQuest로 등록합니다.
    if (remote.questType === "main") {
      return {
        id: actionId,
        intent: "project.create",
        title: remote.title,
        summary: `공주님, '${remote.title}'을(를) 새 메인 퀘스트(프로젝트)로 집무실에 등록해드릴까요?`,
        confirmLabel: "메인 퀘스트 생성",
        payload: {
          mainQuest: { title: remote.title },
        },
        logEntries: [{ domain: "project", label: remote.title, detail: "새 메인 퀘스트(프로젝트) 생성" }],
      };
    }

    const questType = remote.questType === "side" ? "side" : "daily";
    const dueDate = remote.dueDate ?? getKoreanToday();
    return {
      id: actionId,
      intent: "quest.create",
      title: remote.title,
      summary: `공주님, '${remote.title}'을(를) ${dueDate} 마감 ${questTypeMeta[questType].label} 퀘스트로 등록해드릴까요?`,
      confirmLabel: "Quest 생성",
      payload: {
        quest: {
          title: remote.title,
          description: remote.description ?? "세린이 대화에서 정리한 Quest입니다.",
          type: questType,
          priority: "medium",
          progress: 0,
          expReward: questTypeMeta[questType].baseExp,
          goldReward: 0,
          dueDate,
          rewardClaimed: false,
          source: "serin",
        },
      },
      logEntries: [
        { domain: "quest", label: remote.title, detail: `마감 ${dueDate} ${questTypeMeta[questType].label} Quest 생성` },
      ],
    };
  }

  if (remote.type === "memory.save") {
    const memoryType = (MEMORY_TYPES as readonly string[]).includes(remote.memoryType)
      ? (remote.memoryType as (typeof MEMORY_TYPES)[number])
      : "preference";
    return {
      id: actionId,
      intent: "memory.save",
      title: remote.content,
      summary: `공주님, "${remote.content}" — 이렇게 기억해둘까요?`,
      confirmLabel: "기억하기",
      payload: {
        memory: {
          memoryType,
          content: remote.content,
          importance: "medium",
          source: "chat",
        },
      },
      logEntries: [{ domain: "memory", label: "새 기억", detail: remote.content }],
    };
  }

  return null;
}

function isRemoteAction(value: unknown): value is RemoteAction {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return type === "calendar.create" || type === "quest.create" || type === "memory.save";
}

// ---------------------------------------------------------------------------
// 오프라인 대비용 로컬 파서 경로. Netlify Function이 없을 때(로컬 vite 단독 실행)만
// 사용됩니다. 정규식 기반이라 자연어 이해에 한계가 있습니다.
// ---------------------------------------------------------------------------
function buildLocalResult(input: SerinServiceMessageInput): { intent: SerinIntent; result: SerinExecutionResult } {
  const parsed = parseIntent(
    input.content,
    input.attachments,
    input.mainQuestTitles ?? [],
    input.questRefs ?? [],
    input.eventRefs ?? [],
  );
  const action = parsed.needsConfirmation ? executeIntent(parsed) : null;

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

// Netlify AI 함수 호출이 실패했을 때만 쓰이는 마지막 대비용 문장입니다.
const FALLBACK_REPLIES = [
  "죄송해요, 공주님. 지금 이 부분은 제가 바로 답을 드리기 어려워요. 조금만 더 구체적으로 말씀해주시면 도와드릴게요.",
  "공주님, 방금 말씀은 제가 정확히 파악하지 못했어요. Quest나 일정 관련이라면 다시 한 번 편하게 말씀해주세요.",
  "잠시 확인이 필요한 내용이에요, 공주님. 등록하실 일정이나 Quest가 있으면 말씀해주시고, 아니면 조금만 더 자세히 알려주세요.",
];

function pickFallbackReply() {
  return FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)];
}

/**
 * 세린의 실제 대화 응답. 모든 메시지를 Claude(serin-chat 함수)에 먼저 보내고,
 * Claude가 구조화된 액션을 반환하면 확인 카드로 변환합니다. 함수 호출이
 * 실패했을 때만 로컬 파서로 대체합니다.
 */
export async function sendMessage(
  input: SerinServiceMessageInput,
  history: SerinHistoryItem[] = [],
): Promise<SerinExecutionResult> {
  try {
    const response = await fetch("/.netlify/functions/serin-chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: input.content, history, today: getKoreanToday() }),
    });

    if (!response.ok) throw new Error(`serin-chat ${response.status}`);
    const data = await response.json();

    const action = isRemoteAction(data?.action) ? buildActionFromRemote(data.action) : null;
    const reply = typeof data?.reply === "string" && data.reply.trim() ? data.reply.trim() : null;

    if (action) {
      // Claude가 확인 멘트를 함께 준 경우 그 문장을 쓰고, 없으면 액션 요약을 씁니다.
      return { action, reply: reply ?? action.summary, status: "speaking" };
    }
    if (reply) {
      return { action: null, reply, status: "speaking" };
    }
    throw new Error("empty reply");
  } catch {
    // Netlify Function 미배포/API 실패 시에만 로컬 파서로 대체합니다.
    return buildLocalResult(input).result;
  }
}
