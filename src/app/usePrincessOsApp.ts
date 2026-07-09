import { useMemo, useState } from "react";
import type { CalendarEventInput, SerinAction, SerinMemory, SerinMessage, ViewKey } from "./types";
import { useCalendarEvents } from "../features/calendar/hooks/useCalendarEvents";
import { useCastle } from "../features/castle/hooks/useCastle";
import { useCastleRooms } from "../features/castle/hooks/useCastleRooms";
import { usePrincess } from "../features/princess/hooks/usePrincess";
import { createQuestFromSerinAction, useQuestDomain } from "../features/quest/hooks/useQuestDomain";
import { useSerinChat } from "../features/serin/hooks/useSerinChat";
import { useSerinIntent } from "../features/serin/hooks/useSerinIntent";
import { useSerinMemory } from "../features/serin/hooks/useSerinMemory";
import { cancelAction, confirmAction } from "../features/serin/services/serinActionExecutor";
import { createQuestFromCalendarEvent } from "../domain/questDomain";
import { princessOsRepository } from "../repositories";

const initialSerinMemories: SerinMemory[] = [
  {
    id: "memory-001",
    memoryType: "routine",
    content: "공주님은 오전에 중요한 업무를 먼저 배치할 때 집중도가 높습니다.",
    importance: "high",
    source: "system",
    createdAt: "2026-07-09T09:00:00+09:00",
  },
];

function princessMessage(content: string): SerinMessage {
  const now = new Date().toISOString();
  return { id: `m-${now}-p`, sender: "princess", content, createdAt: now, messageType: "text" };
}

function serinMessage(content: string, action: SerinAction | null = null): SerinMessage {
  return {
    id: `m-${Date.now()}-s`,
    sender: "serin",
    content,
    createdAt: new Date().toISOString(),
    messageType: action ? "confirmation" : "text",
    metadata: action ? { actionId: action.id, intent: action.intent } : undefined,
  };
}

function greetingMessage(): SerinMessage {
  return serinMessage("좋은 아침입니다, 공주님.\n오늘은 어디로 가실까요?", null);
}

function isAffirmative(content: string) {
  const normalized = content.trim().toLowerCase();
  return (
    /^(응|그래|당연하지|좋아|부탁해|등록해|해줘|진행해|확인)$/i.test(normalized) ||
    normalized.includes("퀘스트에 등록") ||
    normalized.includes("일정에 넣어") ||
    normalized.includes("캘린더에 넣어")
  );
}

export function usePrincessOsApp() {
  const snapshot = useMemo(() => princessOsRepository.getSnapshot(), []);
  const [activeView, setActiveView] = useState<ViewKey>("home");
  const [selectedDate, setSelectedDate] = useState("2026-07-09");
  const [pendingSerinAction, setPendingSerinAction] = useState<SerinAction | null>(null);
  const [lastSerinInput, setLastSerinInput] = useState("");
  const activeSerinIntent = useSerinIntent(lastSerinInput);

  const questDomain = useQuestDomain(snapshot.quests, snapshot.questHistory, snapshot.progress);
  const calendar = useCalendarEvents(snapshot.events);
  const serinChat = useSerinChat([greetingMessage()]);
  const serinMemory = useSerinMemory(initialSerinMemories);
  const princess = usePrincess(snapshot.princess);
  const { castleState, addCastleExp } = useCastle();
  const castleRooms = useCastleRooms(snapshot.rooms, questDomain.progress.level);

  const appData = {
    ...snapshot,
    princess: princess.princess,
    quests: questDomain.quests,
    questHistory: questDomain.history,
    events: calendar.events,
    serinMessages: serinChat.messages,
    progress: questDomain.progress,
    rooms: castleRooms.rooms,
  };

  function completeQuest(id: string) {
    const quest = questDomain.completeQuest(id);
    if (quest) addCastleExp(Math.max(10, Math.round(quest.expReward * 0.4)));
  }

  function createCalendarEvent(input: CalendarEventInput, linkQuest = false) {
    if (!linkQuest) {
      calendar.createEvent(input);
      return;
    }
    const event = calendar.createEventWithLinkedQuest({ ...input, category: input.category ?? "quest" });
    if (!event) return;
    const quest = createQuestFromCalendarEvent(event);
    questDomain.addQuest(quest);
    calendar.applyLinkedQuestId(event.id, quest.id);
  }

  function applySerinAction(action: SerinAction, secondary = false) {
    confirmAction(action);

    if (action.intent === "calendar.create" && action.payload.calendar) {
      createCalendarEvent(action.payload.calendar, secondary);
      return `네, 공주님.\n'${action.payload.calendar.title}' 일정을 등록해두었습니다.\n잊지 않으시도록 제가 곁에서 챙기겠습니다.`;
    }

    if (action.intent === "quest.create") {
      const quest = createQuestFromSerinAction(action);
      questDomain.addQuest(quest);
      return `네, 공주님.\n'${quest.title}' Quest를 ${quest.dueDate} 할 일로 등록해두었습니다.\n차분히 해내실 수 있도록 제가 곁에서 챙기겠습니다.`;
    }

    if (action.intent === "memory.save" && action.payload.memory) {
      serinMemory.saveMemory(action.payload.memory);
      return "기억해둘게요, 공주님.\n다음 일정과 Quest를 정리할 때 조심스럽게 참고하겠습니다.";
    }

    return "네, 공주님. 요청을 반영해두었습니다.";
  }

  async function sendSerinMessage(content: string) {
    setLastSerinInput(content);
    serinChat.setStatus("thinking");
    const history = serinChat.messages.slice(-8).map((message) => ({
      role: message.sender === "princess" ? "user" as const : "assistant" as const,
      content: message.content,
    }));
    serinChat.setMessages((current) => [...current, princessMessage(content)]);

    if (pendingSerinAction && isAffirmative(content)) {
      const applied = applySerinAction(pendingSerinAction, content.includes("Quest") || content.includes("퀘스트"));
      setPendingSerinAction(null);
      serinChat.setStatus("speaking");
      serinChat.setMessages((current) => [...current, serinMessage(applied)]);
      window.setTimeout(() => serinChat.setStatus("idle"), 420);
      return;
    }

    const result = await princessOsRepository.sendSerinMessage({
      conversationId: "serin-conversation-default",
      content,
      history,
    });

    if (result.action) {
      setPendingSerinAction(result.action);
    }

    serinChat.setStatus(result.status);
    serinChat.setMessages((current) => [
      ...current,
      {
        ...serinMessage(result.reply, result.action),
        metadata: result.action
          ? { actionId: result.action.id, intent: result.action.intent, parsedIntent: activeSerinIntent.intent }
          : { parsedIntent: activeSerinIntent.intent },
      },
    ]);
    window.setTimeout(() => serinChat.setStatus("idle"), 420);
  }

  function confirmSerinActionHandler(secondary = false) {
    if (!pendingSerinAction) return;
    const applied = applySerinAction(pendingSerinAction, secondary);
    serinChat.setMessages((current) => [...current, serinMessage(applied)]);
    setPendingSerinAction(null);
    serinChat.setStatus("idle");
  }

  function cancelSerinActionHandler() {
    if (pendingSerinAction) cancelAction(pendingSerinAction);
    setPendingSerinAction(null);
    serinChat.setMessages((current) => [
      ...current,
      serinMessage("알겠습니다, 공주님.\n이번 요청은 실행하지 않고 조용히 내려놓겠습니다."),
    ]);
  }

  function handleAttach(type: "image" | "document" | "audio") {
    const message =
      type === "image"
        ? "사진 첨부를 준비했습니다, 공주님. 명함이라면 인연록으로 정리할 수 있어요."
        : type === "document"
          ? "파일 첨부를 준비했습니다, 공주님. 문서 요약은 왕국도서관과 연결하겠습니다."
          : "음성 입력을 준비했습니다, 공주님. 실제 음성 인식 연결 지점은 TODO로 남겨두었습니다.";
    serinChat.setMessages((current) => [...current, serinMessage(message)]);
  }

  return {
    activeView,
    setActiveView,
    selectedDate,
    setSelectedDate,
    appData,
    snapshot,
    castleState,
    castleRooms,
    pendingSerinAction,
    serinMemories: serinMemory.memories,
    serinStatus: serinChat.status,
    sendSerinMessage,
    confirmSerinAction: confirmSerinActionHandler,
    cancelSerinAction: cancelSerinActionHandler,
    handleAttach,
    completeQuest,
    cycleQuest: questDomain.cycleQuest,
    completionEvents: questDomain.completionEvents,
    createCalendarEvent,
    completeCalendarEvent: calendar.completeEvent,
    cancelCalendarEvent: calendar.deleteEvent,
  };
}
