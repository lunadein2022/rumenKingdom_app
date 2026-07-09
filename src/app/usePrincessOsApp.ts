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
import { princessOsRepository } from "../repositories";
import { createQuestFromCalendarEvent } from "../domain/questDomain";

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

export function usePrincessOsApp() {
  const snapshot = useMemo(() => princessOsRepository.getSnapshot(), []);
  const [activeView, setActiveView] = useState<ViewKey>("home");
  const [selectedDate, setSelectedDate] = useState("2026-07-09");
  const [pendingSerinAction, setPendingSerinAction] = useState<SerinAction | null>(null);
  const [lastSerinInput, setLastSerinInput] = useState("");
  const activeSerinIntent = useSerinIntent(lastSerinInput);

  const questDomain = useQuestDomain(snapshot.quests, snapshot.questHistory, snapshot.progress);
  const calendar = useCalendarEvents(snapshot.events);
  const serinChat = useSerinChat(snapshot.serinMessages);
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

  async function sendSerinMessage(content: string) {
    setLastSerinInput(content);
    serinChat.setStatus("thinking");
    serinChat.setMessages((current) => [...current, princessMessage(content)]);

    const result = await princessOsRepository.sendSerinMessage({ conversationId: "serin-conversation-default", content });
    if (content.includes("기억")) {
      serinMemory.saveMemory({
        memoryType: "preference",
        content: content.replace(/기억해줘|기억해/g, "").trim() || content,
        importance: "medium",
        source: "chat",
      });
    }

    setPendingSerinAction(result.action);
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
    confirmAction(pendingSerinAction);

    if (pendingSerinAction.intent === "calendar.create" && pendingSerinAction.payload.calendar) {
      createCalendarEvent(pendingSerinAction.payload.calendar, secondary);
    }
    if (pendingSerinAction.intent === "quest.create") {
      questDomain.addQuest(createQuestFromSerinAction(pendingSerinAction));
    }
    if (pendingSerinAction.intent === "memory.save" && pendingSerinAction.payload.memory) {
      serinMemory.saveMemory(pendingSerinAction.payload.memory);
    }

    serinChat.setMessages((current) => [
      ...current,
      {
        id: `m-${Date.now()}-confirmed`,
        sender: "serin",
        content: "완료했습니다, 공주님. 실행 결과를 Princess OS에 반영했습니다.",
        createdAt: new Date().toISOString(),
        messageType: "system_notice",
        metadata: { intent: pendingSerinAction.intent },
      },
    ]);
    setPendingSerinAction(null);
    serinChat.setStatus("idle");
  }

  function cancelSerinActionHandler() {
    if (pendingSerinAction) cancelAction(pendingSerinAction);
    setPendingSerinAction(null);
    serinChat.setMessages((current) => [
      ...current,
      {
        id: `m-${Date.now()}-cancelled`,
        sender: "serin",
        content: "알겠습니다. 공주님의 이 요청은 실행하지 않겠습니다.",
        createdAt: new Date().toISOString(),
        messageType: "system_notice",
      },
    ]);
  }

  function handleAttach(type: "image" | "document" | "audio") {
    const message =
      type === "image"
        ? "사진 첨부를 준비했습니다. 명함이라면 연락처 추출로 이어갈 수 있어요."
        : type === "document"
          ? "파일 첨부를 준비했습니다. 문서 요약은 Library Domain과 연결될 예정입니다."
          : "음성 입력을 준비했습니다. 실제 음성 인식 연결 지점은 TODO로 남겨두었습니다.";
    serinChat.setMessages((current) => [
      ...current,
      { id: `m-${Date.now()}-attachment`, sender: "serin", content: message, createdAt: new Date().toISOString(), messageType: "system_notice" },
    ]);
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
