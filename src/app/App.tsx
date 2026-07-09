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
import { PrincessCharacter } from "../components/modules/PrincessCharacter";
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
import { cancelAction, confirmAction } from "../features/serin/services/serinActionExecutor";
import { sendMessage as sendSerinDomainMessage } from "../features/serin/services/serinService";
import { saveMemory } from "../features/serin/services/serinMemoryService";

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
  const [messages, setMessages] = useState<SerinMessage[]>(snapshot.serinMessages);
  const [serinStatus, setSerinStatus] = useState<SerinStatus>("idle");
  const [pendingSerinAction, setPendingSerinAction] = useState<SerinAction | null>(null);
  const [serinMemories, setSerinMemories] = useState<SerinMemory[]>(initialSerinMemories);
  const [selectedDate, setSelectedDate] = useState("2026-07-09");
  const progress = useMemo(() => buildProgress(quests, progressBase), [quests, progressBase]);
  const appData = { ...snapshot, quests, questHistory, events, serinMessages: messages, progress };

  function completeQuest(id: string) {
    const result = completeQuestDomain(quests, questHistory, id, progress);
    setQuests(result.quests);
    setQuestHistory(result.history);
    setCompletionEvents(result.events);
    setProgressBase(result.progress);
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
    const princessMessage: SerinMessage = {
      id: `m-${now}-p`,
      sender: "princess",
      content,
      createdAt: now,
      messageType: "text",
    };

    setSerinStatus("thinking");
    setMessages((current) => [...current, princessMessage]);

    try {
      const result = await sendSerinDomainMessage({
        conversationId: "mock-serin-conversation",
        content,
      });

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
          id: `m-${now}-s`,
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
          id: `m-${now}-error`,
          sender: "serin",
          content: "죄송해요, 공주님. 지금은 처리하지 못했습니다. 잠시 후 다시 시도해볼게요.",
          createdAt: new Date().toISOString(),
          messageType: "error",
        },
      ]);
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

    const now = new Date().toISOString();
    setMessages((current) => [
      ...current,
      {
        id: `m-${now}-confirmed`,
        sender: "serin",
        content: "완료했습니다, 공주님. 실행 결과를 Princess OS에 반영했습니다.",
        createdAt: now,
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
        content: "알겠습니다, 공주님. 이 요청은 실행하지 않겠습니다.",
        createdAt: new Date().toISOString(),
        messageType: "system_notice",
      },
    ]);
  }

  function handleAttach(type: "image" | "document" | "audio") {
    const message =
      type === "image"
        ? "사진 첨부를 준비했습니다. 명함이면 연락처 추출로 이어갈 수 있어요."
        : type === "document"
          ? "파일 첨부를 준비했습니다. 문서 요약은 Library Domain과 연결 예정입니다."
          : "음성 입력을 준비했습니다. 실제 음성 인식 연결 지점은 TODO로 남겨두었습니다.";
    setMessages((current) => [
      ...current,
      {
        id: `m-${Date.now()}-attachment`,
        sender: "serin",
        content: message,
        createdAt: new Date().toISOString(),
        messageType: "system_notice",
      },
    ]);
  }

  return (
    <div className="mobile-app-shell">
      <main className="mobile-app-main">
        {activeView === "home" && (
          <HomeScene data={appData} activeView={activeView} onNavigate={setActiveView} />
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
            onCreateEvent={createCalendarEvent}
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
        {activeView === "progress" && (
          <ProgressScreen
            data={appData}
            onOpenProfile={() => setActiveView("profile")}
          />
        )}
        {activeView === "profile" && <PrincessCharacter data={appData} />}
      </main>

      <BottomNav activeView={activeView} onChange={setActiveView} />
    </div>
  );
}
