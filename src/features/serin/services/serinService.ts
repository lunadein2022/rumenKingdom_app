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
        ? `공주님, '${remote.title}'을 ${remote.startDate}부터 ${remote.endDate}까지 일정으로 등록해드릴까요?`
        : isAllDay
          ? `공주님, '${remote.title}'을 ${remote.startDate} 종일 일정으로 등록해드릴까요?`
          : `공주님, '${remote.title}'을 ${formatKoreanDateTime(startAt)} 일정으로 등록해드릴까요?`,
      confirmLabel: "일정 추가",
      secondaryLabel: isMultiDay ? undefined : "Quest도 만들기",
      payload: {
        calendar: {
          title: remote.title,
          description: "세린의 대화에서 정리한 일정입니다.",
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
      logEntries: [{ domain: "calendar", label: remote.title, detail: "일정 생성" }],
    };
  }

  if (remote.type === "quest.create") {
    if (remote.questType === "main") {
      return {
        id: actionId,
        intent: "project.create",
        title: remote.title,
        summary: `공주님, '${remote.title}'을 메인 Quest(프로젝트)로 등록해드릴까요?`,
        confirmLabel: "메인 Quest 생성",
        payload: { mainQuest: { title: remote.title } },
        logEntries: [{ domain: "project", label: remote.title, detail: "메인 Quest 생성" }],
      };
    }

    const questType = remote.questType === "side" ? "side" : "daily";
    const dueDate = remote.dueDate ?? getKoreanToday();
    return {
      id: actionId,
      intent: "quest.create",
      title: remote.title,
      summary: `공주님, '${remote.title}'을 ${dueDate} 마감 ${questTypeMeta[questType].label} Quest로 등록해드릴까요?`,
      confirmLabel: "Quest 생성",
      payload: {
        quest: {
          title: remote.title,
          description: remote.description ?? "세린의 대화에서 정리한 Quest입니다.",
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
      logEntries: [{ domain: "quest", label: remote.title, detail: `${questTypeMeta[questType].label} Quest 생성` }],
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
      summary: `공주님, "${remote.content}" 이 내용을 기억해둘까요?`,
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
        reply: "공주님, 그 기록은 왕국도서관에서 함께 찾아보겠습니다. 검색 결과를 열어둘게요.",
        status: "speaking",
      },
    };
  }

  if (action) {
    return { intent: parsed.intent, result: { action, reply: action.summary, status: "speaking" } };
  }

  return { intent: parsed.intent, result: { action: null, reply: fallbackSerinResponse(input.content), status: "speaking" } };
}

export function fallbackSerinResponse(message: string) {
  if (/(갔었|다녀왔|좋았어|힘들었어|먹었어|봤어)/.test(message)) {
    return "그랬군요, 공주님. 그 순간이 공주님께 어떤 느낌으로 남았는지 조금 더 들려주셔도 괜찮아요.";
  }
  if (/(고민이야|어쩌지|모르겠어|해야 하는데)/.test(message)) {
    return "공주님, 바로 일정이나 Quest로 만들기보다 먼저 생각을 정리해볼까요? 제가 옆에서 차분히 들어드리겠습니다.";
  }
  if (/(장바구니|쇼핑|구매)/.test(message)) {
    return "알겠습니다, 공주님. 이건 Princess OS의 일정이나 Quest로 바로 넣기보다는 메모처럼 다뤄도 좋겠어요. 필요하시면 기억해두겠습니다.";
  }
  return "네, 공주님. 말씀 듣고 있습니다. 일정이나 Quest로 정리할 일이 있으면 제가 알아서 확인드리고, 그냥 이야기라면 편하게 들어드릴게요.";
}

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

    if (action) return { action, reply: reply ?? action.summary, status: "speaking" };
    if (reply) return { action: null, reply, status: "speaking" };
    throw new Error("empty reply");
  } catch {
    return buildLocalResult(input).result;
  }
}
