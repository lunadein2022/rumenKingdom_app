import { useMemo, useState } from "react";
import type {
  CalendarEvent,
  CalendarEventInput,
  Quest,
  QuestCompletionEvent,
  QuestHistoryEntry,
  SerinAction,
  SerinMemory,
  SerinMessage,
  SerinStatus,
  UserProgress,
  ViewKey,
} from "./types";
import { BottomNav } from "../components/design-system/BottomNav";
import { HomeScene } from "../components/home/HomeScene";
import { ProgressScreen } from "../components/modules/ProgressScreen";
import { QuestScreen } from "../components/modules/QuestScreen";
import { SerinScreen } from "../components/modules/SerinScreen";
import { buildMockProgress } from "../data/mockProgress";
import { getPrincessOsSnapshot } from "../data/mockRepository";
import { completeQuestDomain, createQuestFromCalendarEvent, questTypeMeta } from "../domain/questDomain";
import { CalendarPage } from "../features/calendar/pages/CalendarPage";
import {
  applyLinkedQuestId,
  buildCalendarEvent,
  completeEvent,
  createEvent,
  deleteEvent,
} from "../features/calendar/services/calendarService";
import { useCastle } from "../features/castle/hooks/useCastle";
import { useCastleRooms } from "../features/castle/hooks/useCastleRooms";
import { GardenPage } from "../features/garden/pages/GardenPage";
import { LibraryPage } from "../features/library/pages/LibraryPage";
import { PrincessPage } from "../features/princess/pages/PrincessPage";
import { cancelAction, confirmAction } from "../features/serin/services/serinActionExecutor";
import { sendMessage as sendSerinDomainMessage } from "../features/serin/services/serinService";
import { saveMemory } from "../features/serin/services/serinMemoryService";

// 짧은 긍정/부정 답변으로 직전 pendingAction을 이어서 처리하기 위한 감지기.
// "응", "그래", "당연하지", "부탁해", "등록해", "일정에 넣어" 같은 표현을 포함합니다.
const SHORT_AFFIRM = /(응|어|그래|당연|부탁|등록해|넣어줘|넣어|좋아|네|넵|콜|오케이|ok)/i;
const SHORT_DECLINE = /(아니|괜찮아|괜찮습니다|취소|하지\s*마|넘어가)/i;

function isShortReply(text: string) {
  return text.trim().length > 0 && text.trim().length <= 14;
}

function buildTimeGreeting(): SerinMessage {
  const hour = new Date().getHours();
  const content =
    hour < 11
      ? "좋은 아침입니다, 공주님. 오늘 하루도 제가 곁에서 잘 챙기겠습니다."
      : hour < 18
        ? "공주님, 오늘 일정이 잘 진행되고 있어요. 필요한 게 있으면 언제든 말씀해주세요."
        : "공주님, 오늘 하루도 정말 수고하셨어요. 편히 쉬실 수 있게 제가 정리해드릴게요.";
  return {
    id: `m-greeting-${Date.now()}`,
    sender: "serin",
    content,
    createdAt: new Date().toISOString(),
    messageType: "text",
  };
}

function buildConfirmedReply(action: SerinAction): string {
  if (action.intent === "quest.create") {
    return `네, 공주님. '${action.title}' 퀘스트를 등록해두었습니다. 잊지 않으시도록 제가 곁에서 챙기겠습니다.`;
  }
  if (action.intent === "calendar.create") {
    return `네, 공주님. '${action.title}' 일정을 등록해두었습니다. 시간에 맞춰 알려드릴게요.`;
  }
  if (action.intent === "memory.save") {
    return "기억해둘게요, 공주님. 다음부터 이 내용을 참고해서 챙기겠습니다.";
  }
  if (action.intent === "diary.create" || action.intent === "diary.summarize") {
    return "네, 공주님. 다이어리 초안을 정리해 왕국도서관에 담아두었습니다.";
  }
  return `네, 공주님. '${action.title}' 요청을 처리해두었습니다.`;
}

function buildProgress(quests: Quest[], base: UserProgress): UserProgress {
  return {
    ...buildMockProgress(quests, base.currentExp, base.requiredExp),
    level: base.level,
    streakDays: base.streakDays,
  };
}

function createQuestFromSerinAction(action: SerinAction): Quest {
  const payload = action.payload.quest ?? {};
  return {
    id: `q-serin-${Date.now()}`,
    type: payload.type ?? "side",
    title: payload.title ?? action.title,
    description: payload.description ?? "세린이 대화에서 정리한 Quest입니다.",
    status: "pending",
    category: payload.category ?? "growth",
    priority: payload.priority ?? "medium",
    progress: payload.progress ?? 0,
    expReward: payload.expReward ?? questTypeMeta.side.baseExp,
    goldReward: payload.goldReward ?? 8,
    dueDate: payload.dueDate ?? "2026-07-09",
    rewardClaimed: false,
    source: "serin",
  };
}

const initialSerinMemories: SerinMemory[] = [
  {
    id: "memory-001",
    memoryType: "routine",
    content: "공주님은 오전에 중요한 업무를 먼저 끝낼 때 집중도가 높습니다.",
    importance: "high",
    source: "system",
    createdAt: "2026-07-09T09:00:00+09:00",
  },
];

export function App() {
  const snapshot = useMemo(() => getPrincessOsSnapshot(), []);
  const [activeView, setActiveView] = useState<ViewKey>("home");
  const [quests, setQuests] = useState<Quest[]>(snapshot.quests);
  const [questHistory, setQuestHistory] = useState<QuestHistoryEntry[]>(snapshot.questHistory);
  const [completionEvents, setCompletionEvents] = useState<QuestCompletionEvent[]>([]);
  const [progressBase, setProgressBase] = useState<UserProgress>(snapshot.progress);
  const [events, setEvents] = useState<CalendarEvent[]>(snapshot.events);
  // 화면 채팅은 세션 한정입니다. 새로고침하면 이전 대화는 사라지고 새 인사부터 시작합니다.
  // (장기 기억은 별도로 serinMemories에 저장되어 새로고침해도 남아 있습니다.)
  const [messages, setMessages] = useState<SerinMessage[]>(() => [buildTimeGreeting()]);
  const [serinStatus, setSerinStatus] = useState<SerinStatus>("idle");
  const [pendingSerinAction, setPendingSerinAction] = useState<SerinAction | null>(null);
  const [serinMemories, setSerinMemories] = useState<SerinMemory[]>(initialSerinMemories);
  const [selectedDate, setSelectedDate] = useState("2026-07-09");
  const { addCastleExp } = useCastle();
  const castleRooms = useCastleRooms(snapshot.rooms);
  const progress = useMemo(() => buildProgress(quests, progressBase), [quests, progressBase]);
  const appData = { ...snapshot, quests, questHistory, events, serinMessages: messages, progress, rooms: castleRooms.rooms };

  function completeQuest(id: string) {
    const result = completeQuestDomain(quests, questHistory, id, progress);
    const quest = quests.find((item) => item.id === id);
    setQuests(result.quests);
    setQuestHistory(result.history);
    setCompletionEvents(result.events);
    setProgressBase(result.progress);
    if (quest) addCastleExp(Math.max(10, Math.round(quest.expReward * 0.4)));
  }

  function cycleQuest(id: string) {
    setQuests((current) =>
      current.map((quest) => {
        if (quest.id !== id) return quest;
        const next = quest.status === "pending" ? "inProgress" : quest.status === "inProgress" ? "completed" : "pending";
        return {
          ...quest,
          status: next,
          completedAt: next === "completed" ? new Date().toISOString() : undefined,
          rewardClaimed: next === "completed" ? false : quest.rewardClaimed,
        };
      }),
    );
  }

  function createCalendarEvent(input: CalendarEventInput, linkQuest = false) {
    if (!linkQuest) {
      setEvents((current) => createEvent(current, input));
      return;
    }

    const event = buildCalendarEvent({ ...input, category: input.category ?? "quest" });
    const quest = createQuestFromCalendarEvent(event);
    setQuests((current) => [quest, ...current]);
    setEvents((current) => applyLinkedQuestId([event, ...current], event.id, quest.id));
  }

  async function sendSerinMessage(content: string) {
    const now = new Date().toISOString();
    const recentHistory = messages.slice(-8).map((item) => ({ sender: item.sender, content: item.content }));
    setMessages((current) => [
      ...current,
      { id: `m-${now}-p`, sender: "princess", content, createdAt: now, messageType: "text" },
    ]);

    // 직전에 세린이 확인을 물어본 상태(pendingAction)에서 "응", "그래", "당연하지", "부탁해",
    // "등록해" 같은 짧은 답변이 오면, 새로 의도를 해석하지 않고 그 pendingAction을 바로 이어서
    // 실행합니다. ("무엇을 등록할지 모르겠다"는 답을 하지 않기 위함)
    if (pendingSerinAction && isShortReply(content)) {
      if (SHORT_AFFIRM.test(content)) {
        confirmSerinAction();
        return;
      }
      if (SHORT_DECLINE.test(content)) {
        cancelSerinAction();
        return;
      }
    }

    setSerinStatus("thinking");

    try {
      const result = await sendSerinDomainMessage(
        { conversationId: "mock-serin-conversation", content },
        recentHistory,
      );
      if (content.includes("기억")) {
        setSerinMemories((current) =>
          saveMemory(current, {
            memoryType: "preference",
            content: content.replace(/기억해줘|기억해/g, "").trim() || content,
            importance: "medium",
            source: "chat",
          }),
        );
      }

      setPendingSerinAction(result.action);
      setSerinStatus(result.status);
      setMessages((current) => [
        ...current,
        {
          id: `m-${Date.now()}-s`,
          sender: "serin",
          content: result.reply,
          createdAt: new Date().toISOString(),
          messageType: result.action ? "confirmation" : "text",
          metadata: result.action ? { actionId: result.action.id, intent: result.action.intent } : undefined,
        },
      ]);
      window.setTimeout(() => setSerinStatus("idle"), 420);
    } catch {
      setSerinStatus("error");
      setMessages((current) => [
        ...current,
        {
          id: `m-${Date.now()}-error`,
          sender: "serin",
          content:
            "죄송합니다, 공주님. 제가 방금 말씀을 제대로 이해하지 못했어요. 조금만 더 알려주시면 바로 도와드리겠습니다.",
          createdAt: new Date().toISOString(),
          messageType: "error",
        },
      ]);
      window.setTimeout(() => setSerinStatus("idle"), 420);
    }
  }

  function confirmSerinAction(secondary = false) {
    if (!pendingSerinAction) return;
    confirmAction(pendingSerinAction);

    if (pendingSerinAction.intent === "calendar.create" && pendingSerinAction.payload.calendar) {
      createCalendarEvent(pendingSerinAction.payload.calendar, secondary);
    }
    if (pendingSerinAction.intent === "quest.create") {
      setQuests((current) => [createQuestFromSerinAction(pendingSerinAction), ...current]);
    }
    if (pendingSerinAction.intent === "memory.save" && pendingSerinAction.payload.memory) {
      setSerinMemories((current) => saveMemory(current, pendingSerinAction.payload.memory!));
    }

    setMessages((current) => [
      ...current,
      {
        id: `m-${Date.now()}-confirmed`,
        sender: "serin",
        content: buildConfirmedReply(pendingSerinAction),
        createdAt: new Date().toISOString(),
        messageType: "system_notice",
        metadata: { intent: pendingSerinAction.intent },
      },
    ]);
    setPendingSerinAction(null);
    setSerinStatus("idle");
  }

  function cancelSerinAction() {
    if (pendingSerinAction) cancelAction(pendingSerinAction);
    setPendingSerinAction(null);
    setMessages((current) => [
      ...current,
      {
        id: `m-${Date.now()}-cancelled`,
        sender: "serin",
        content: "알겠습니다, 공주님. 이번에는 넘어가겠습니다. 필요하시면 언제든 다시 말씀해주세요.",
        createdAt: new Date().toISOString(),
        messageType: "system_notice",
      },
    ]);
    setSerinStatus("idle");
  }

  function handleAttach(type: "image" | "document" | "audio") {
    const message =
      type === "image"
        ? "공주님, 사진을 확인했습니다. 명함이면 연락처로 정리해드릴게요."
        : type === "document"
          ? "공주님, 파일을 확인했습니다. 필요한 내용은 왕국도서관에 정리해두겠습니다."
          : "공주님, 음성 입력은 곧 지원해드릴 수 있도록 준비하고 있어요. 지금은 글로 말씀해주시면 바로 도와드릴게요.";
    setMessages((current) => [
      ...current,
      { id: `m-${Date.now()}-attachment`, sender: "serin", content: message, createdAt: new Date().toISOString(), messageType: "system_notice" },
    ]);
  }

  return (
    <div className="mobile-app-shell">
      <main className="mobile-app-main">
        {activeView === "home" && (
          <HomeScene
            data={appData}
            activeView={activeView}
            onNavigate={setActiveView}
            onVisitRoom={castleRooms.visitRoom}
          />
        )}
        {activeView === "library" && (
          <LibraryPage
            quests={quests}
            events={events}
            memories={serinMemories}
          />
        )}
        {activeView === "garden" && (
          <GardenPage serin={snapshot.serin} onBackToCastle={() => setActiveView("home")} />
        )}
        {activeView === "quests" && (
          <QuestScreen
            quests={quests}
            history={questHistory}
            progress={progress}
            completionEvents={completionEvents}
            onCompleteQuest={completeQuest}
            onCycleQuest={cycleQuest}
          />
        )}
        {activeView === "calendar" && (
          <CalendarPage
            events={events}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onCompleteEvent={(id) => setEvents((current) => completeEvent(current, id))}
            onCancelEvent={(id) => setEvents((current) => deleteEvent(current, id))}
          />
        )}
        {activeView === "serin" && (
          <SerinScreen
            princess={snapshot.princess}
            serin={snapshot.serin}
            messages={messages}
            status={serinStatus}
            pendingAction={pendingSerinAction}
            memories={serinMemories}
            onSendMessage={sendSerinMessage}
            onConfirmAction={confirmSerinAction}
            onCancelAction={cancelSerinAction}
            onAttach={handleAttach}
          />
        )}
        {activeView === "progress" && <ProgressScreen data={appData} onOpenProfile={() => setActiveView("profile")} />}
        {activeView === "profile" && <PrincessPage data={appData} />}
      </main>

      <BottomNav activeView={activeView} onChange={setActiveView} />
    </div>
  );
}
