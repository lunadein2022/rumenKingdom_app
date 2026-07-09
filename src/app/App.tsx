import { useEffect, useMemo, useState } from "react";
import type {
  CalendarEvent,
  CalendarEventInput,
  DiaryEntry,
  MainQuest,
  Quest,
  QuestCompletionEvent,
  QuestHistoryEntry,
  RelationshipContact,
  SerinAction,
  SerinMemory,
  SerinMessage,
  SerinStatus,
  UserProgress,
  ViewKey,
} from "./types";
import { BottomNav } from "../components/design-system/BottomNav";
import { HomeScene } from "../components/home/HomeScene";
import { QuestScreen } from "../components/modules/QuestScreen";
import { SerinScreen } from "../components/modules/SerinScreen";
import { buildMockProgress } from "../data/mockProgress";
import { getPrincessOsSnapshot } from "../data/mockRepository";
import { completeQuestDomain, createQuestFromCalendarEvent, questTypeMeta } from "../domain/questDomain";
import { addMainQuestUpdate, createMainQuestFromSerinDraft, toggleMainQuestChapter } from "../domain/mainQuestDomain";
import { CalendarPage } from "../features/calendar/pages/CalendarPage";
import {
  applyLinkedQuestId,
  buildCalendarEvent,
  completeEvent,
  createEvent,
  deleteEvent,
  getEventsByDay,
} from "../features/calendar/services/calendarService";
import { CastlePage } from "../features/castle/pages/CastlePage";
import { useCastleRooms } from "../features/castle/hooks/useCastleRooms";
import { BedroomPage } from "../features/bedroom/pages/BedroomPage";
import { GardenPage } from "../features/garden/pages/GardenPage";
import { LibraryPage } from "../features/library/pages/LibraryPage";
import { OfficePage } from "../features/office/pages/OfficePage";
import { RelationshipPage } from "../features/relationship/pages/RelationshipPage";
import { ThronePage } from "../features/throne/pages/ThronePage";
import { cancelAction, confirmAction } from "../features/serin/services/serinActionExecutor";
import {
  getOrCreateConversation,
  saveMessage,
  sendMessage as sendSerinDomainMessage,
} from "../features/serin/services/serinService";
import { saveMemory } from "../features/serin/services/serinMemoryService";

const TODAY = "2026-07-09";

// 짧은 긍정/부정 답변으로 직전 pendingAction을 이어서 처리하기 위한 감지기.
// "응", "그래", "당연하지", "부탁해", "등록해", "일정에 넣어" 같은 표현을 포함합니다.
const SHORT_AFFIRM = /(응|어|그래|당연|부탁|등록해|넣어줘|넣어|좋아|네|넵|콜|오케이|ok)/i;
const SHORT_DECLINE = /(아니|괜찮아|괜찮습니다|취소|하지\s*마|넘어가)/i;

// "내일 뭐하나", "오늘 일정 있어?", "모레 바빠?" 같은 조회성 질문을 감지합니다.
// 등록(calendarTriggerPattern)이 아니라 "이미 있는 일정을 물어보는" 경우이므로,
// 세린이 매번 똑같은 안내문 대신 실제 events 데이터를 기준으로 답합니다.
const SCHEDULE_QUERY_WORDS = /(뭐\s?하|뭐\s?있|무슨\s?일|일정\s?있|일정\s?뭐|스케줄\s?있|바쁘|바빠)/;
const SCHEDULE_DAY_WORDS = /(오늘|내일|모레)/;

function isShortReply(text: string) {
  return text.trim().length > 0 && text.trim().length <= 14;
}

function resolveScheduleQuery(content: string): { date: string; label: string } | null {
  if (!SCHEDULE_DAY_WORDS.test(content) || !SCHEDULE_QUERY_WORDS.test(content)) return null;
  if (content.includes("모레")) return { date: "2026-07-11", label: "모레" };
  if (content.includes("내일")) return { date: "2026-07-10", label: "내일" };
  return { date: "2026-07-09", label: "오늘" };
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
  if (action.intent === "project.create") {
    return `네, 공주님. '${action.title}'을(를) 새 메인퀘스트로 집무실에 등록해두었습니다.`;
  }
  if (action.intent === "project.update") {
    return `네, 공주님. '${action.title}' 프로젝트에 업데이트를 기록해두었습니다.`;
  }
  if (action.intent === "memory.save") {
    return "기억해둘게요, 공주님. 다음부터 이 내용을 참고해서 챙기겠습니다.";
  }
  if (action.intent === "diary.create" || action.intent === "diary.summarize") {
    return "네, 공주님. 다이어리 초안을 정리해 침실에 담아두었습니다.";
  }
  if (action.intent === "contact.extract") {
    return `네, 공주님. '${action.title}'을(를) 인연록에 저장해두었습니다.`;
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
    type: payload.type ?? "daily",
    title: payload.title ?? action.title,
    description: payload.description ?? "세린이 대화에서 정리한 Quest입니다.",
    status: "pending",
    category: payload.category ?? "growth",
    priority: payload.priority ?? "medium",
    progress: payload.progress ?? 0,
    mainQuestId: payload.mainQuestId,
    expReward: payload.expReward ?? questTypeMeta.daily.baseExp,
    goldReward: payload.goldReward ?? 8,
    dueDate: payload.dueDate ?? TODAY,
    rewardClaimed: false,
    source: "serin",
  };
}

function createContactFromSerinAction(action: SerinAction): RelationshipContact {
  const payload = action.payload.contact ?? {};
  return {
    id: `rel-serin-${Date.now()}`,
    name: payload.name ?? action.title,
    affinity: payload.affinity ?? 3,
    organization: payload.organization,
    position: payload.position,
    phone: payload.phone,
    email: payload.email,
    memo: payload.memo,
    relatedMainQuestIds: payload.relatedMainQuestIds ?? [],
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
  const [mainQuests, setMainQuests] = useState<MainQuest[]>(snapshot.mainQuests);
  const [contacts, setContacts] = useState<RelationshipContact[]>(snapshot.contacts);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>(snapshot.diaryEntries);
  const [completionEvents, setCompletionEvents] = useState<QuestCompletionEvent[]>([]);
  const [progressBase, setProgressBase] = useState<UserProgress>(snapshot.progress);
  const [events, setEvents] = useState<CalendarEvent[]>(snapshot.events);
  // 화면 채팅은 세션 한정입니다. 새로고침하면 이전 대화는 사라지고 새 인사부터 시작합니다.
  // (장기 기억은 별도로 serinMemories에 저장되어 새로고침해도 남아 있습니다.)
  const [messages, setMessages] = useState<SerinMessage[]>(() => [buildTimeGreeting()]);
  const [serinStatus, setSerinStatus] = useState<SerinStatus>("idle");
  const [pendingSerinAction, setPendingSerinAction] = useState<SerinAction | null>(null);
  const [serinMemories, setSerinMemories] = useState<SerinMemory[]>(initialSerinMemories);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  // TODO(Alpha 이후): 지금은 세린 대화가 새로고침 시 전부 사라지는 세션 한정 mock
  // 구조입니다. saveMessage/getMessages는 이미 호출되고 있지만 실제로는 아무것도
  // 저장하지 않는 스텁입니다. Supabase 연동 시 이 conversationId로 실제 메시지 기록을
  // 읽고 쓰도록 교체하고, 앱 시작 시 getMessages 결과로 messages 초기값을 채워야 합니다.
  const conversationId = useMemo(() => "mock-serin-conversation", []);
  // Castle은 해금 시스템이 없는 순수 공간 이동 허브입니다. castleRooms는 방 목록과
  // "지금 어느 방에 있는지"(currentRoomKey, 미니맵 하이라이트용)만 관리합니다.
  const castleRooms = useCastleRooms(snapshot.rooms);
  const progress = useMemo(() => buildProgress(quests, progressBase), [quests, progressBase]);
  const appData = {
    ...snapshot,
    quests,
    questHistory,
    mainQuests,
    contacts,
    diaryEntries,
    events,
    serinMessages: messages,
    progress,
    rooms: castleRooms.rooms,
  };

  useEffect(() => {
    // 대화방을 실제로 만들어두는 흐름입니다. 지금은 mock이라 아무 것도 영속화되지
    // 않지만, Supabase 연동 시 이 자리에서 받은 conversationId로 앞으로의
    // saveMessage/getMessages 호출을 교체하면 됩니다.
    void getOrCreateConversation("mock-user");
  }, []);

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

  function toggleMainQuestChapterHandler(mainQuestId: string, chapterId: string) {
    setMainQuests((current) => current.map((mq) => (mq.id === mainQuestId ? toggleMainQuestChapter(mq, chapterId) : mq)));
  }

  function addMainQuestUpdateHandler(mainQuestId: string, content: string) {
    setMainQuests((current) => current.map((mq) => (mq.id === mainQuestId ? addMainQuestUpdate(mq, content, "princess") : mq)));
  }

  function saveDiaryEntry(content: string, moodEmoji: string, moodLabel: string) {
    const todayEvents = getEventsByDay(events, TODAY);
    const todayCompleted = quests.filter((quest) => quest.status === "completed" && quest.dueDate === TODAY);
    const entry: DiaryEntry = {
      id: `diary-${Date.now()}`,
      date: TODAY,
      moodEmoji,
      moodLabel,
      content,
      // TODO: Replace with real AI summary call. 지금은 오늘 데이터를 바탕으로 한
      // 간단한 mock 요약입니다.
      aiSummary: `오늘은 일정 ${todayEvents.length}건, 완료한 퀘스트 ${todayCompleted.length}개와 함께 "${moodLabel}"한 하루였습니다.`,
      linkedEventTitles: todayEvents.map((event) => event.title),
      linkedQuestTitles: todayCompleted.map((quest) => quest.title),
      linkedMainQuestUpdates: mainQuests.flatMap((mq) => mq.updates.filter((update) => update.date.slice(0, 10) === TODAY).map((update) => update.content)),
    };
    setDiaryEntries((current) => [entry, ...current]);
  }

  async function sendSerinMessage(content: string) {
    const now = new Date().toISOString();
    const recentHistory = messages.slice(-8).map((item) => ({ sender: item.sender, content: item.content }));
    const princessMessage: SerinMessage = { id: `m-${now}-p`, sender: "princess", content, createdAt: now, messageType: "text" };
    setMessages((current) => [...current, princessMessage]);
    // 지금은 mock(아무것도 저장하지 않는 스텁)이지만, 실제 흐름(전송 시점에 메시지를
    // 기록)은 이미 연결해두었습니다. Supabase 연동 시 아래 두 saveMessage 호출만
    // 실제 저장으로 바뀌면 됩니다.
    void saveMessage({ conversationId, ...princessMessage });

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

    // "내일 뭐하나" 같은 일정 조회 질문은 AI를 거치지 않고, 실제 events 상태를 바로
    // 조회해서 답합니다. (등록 요청이 아니라 이미 있는 일정을 물어보는 경우)
    const scheduleQuery = resolveScheduleQuery(content);
    if (scheduleQuery) {
      const dayEvents = getEventsByDay(events, scheduleQuery.date);
      const reply =
        dayEvents.length === 0
          ? `공주님, ${scheduleQuery.label}은 등록된 일정이 없어요. 편히 보내셔도 될 것 같아요.`
          : `공주님, ${scheduleQuery.label} 일정은 ${dayEvents
              .map((event) => `${event.startAt.slice(11, 16)} ${event.title}`)
              .join(", ")}(이)가 있어요. 시간 맞춰 챙겨드릴게요.`;
      const scheduleMessage: SerinMessage = {
        id: `m-${Date.now()}-schedule`,
        sender: "serin",
        content: reply,
        createdAt: new Date().toISOString(),
        messageType: "text",
      };
      setMessages((current) => [...current, scheduleMessage]);
      void saveMessage({ conversationId, ...scheduleMessage });
      return;
    }

    setSerinStatus("thinking");

    try {
      const result = await sendSerinDomainMessage(
        { conversationId, content, mainQuestTitles: mainQuests.map((mq) => mq.title) },
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
      const serinMessage: SerinMessage = {
        id: `m-${Date.now()}-s`,
        sender: "serin",
        content: result.reply,
        createdAt: new Date().toISOString(),
        messageType: result.action ? "confirmation" : "text",
        metadata: result.action ? { actionId: result.action.id, intent: result.action.intent } : undefined,
      };
      setMessages((current) => [...current, serinMessage]);
      void saveMessage({ conversationId, ...serinMessage });
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
    if (pendingSerinAction.intent === "project.create") {
      setMainQuests((current) => [createMainQuestFromSerinDraft(pendingSerinAction.title), ...current]);
    }
    if (pendingSerinAction.intent === "project.update" && pendingSerinAction.payload.mainQuestUpdate) {
      const { mainQuestId, content } = pendingSerinAction.payload.mainQuestUpdate;
      // mainQuestId 자리에는 (아직 실제 검색 UI가 없어) 프로젝트 제목이 들어옵니다.
      // id 또는 title 어느 쪽으로 와도 매칭되도록 둘 다 확인합니다.
      setMainQuests((current) =>
        current.map((mq) => (mq.id === mainQuestId || mq.title === mainQuestId ? addMainQuestUpdate(mq, content, "serin") : mq)),
      );
    }
    if (pendingSerinAction.intent === "contact.extract") {
      setContacts((current) => [createContactFromSerinAction(pendingSerinAction), ...current]);
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
        ? "공주님, 사진을 확인했습니다. 명함이면 인연록으로 정리해드릴게요."
        : type === "document"
          ? "공주님, 파일을 확인했습니다. 필요한 내용은 왕국도서관에 정리해두겠습니다."
          : "공주님, 음성 입력은 곧 지원해드릴 수 있도록 준비하고 있어요. 지금은 글로 말씀해주시면 바로 도와드릴게요.";
    setMessages((current) => [
      ...current,
      { id: `m-${Date.now()}-attachment`, sender: "serin", content: message, createdAt: new Date().toISOString(), messageType: "system_notice" },
    ]);
  }

  const todayEvents = getEventsByDay(events, TODAY);
  const todayCompletedQuests = quests.filter((quest) => quest.status === "completed" && quest.dueDate === TODAY);
  const mainQuestUpdatesToday = mainQuests.flatMap((mainQuest) =>
    mainQuest.updates.filter((update) => update.date.slice(0, 10) === TODAY).map((update) => ({ mainQuest, content: update.content })),
  );

  return (
    <div className="app-shell">
      <main className="app-main">
        {activeView === "home" && (
          <HomeScene
            data={appData}
            rooms={castleRooms.rooms}
            currentRoomKey={castleRooms.currentRoomKey}
            onNavigate={setActiveView}
            onCompleteQuest={completeQuest}
          />
        )}
        {activeView === "castle" && (
          <CastlePage rooms={castleRooms.rooms} onNavigate={setActiveView} onVisitRoom={castleRooms.visitRoom} />
        )}
        {activeView === "office" && (
          <OfficePage
            mainQuests={mainQuests}
            quests={quests}
            events={events}
            contacts={contacts}
            onToggleChapter={toggleMainQuestChapterHandler}
            onAddUpdate={addMainQuestUpdateHandler}
          />
        )}
        {activeView === "library" && (
          <LibraryPage
            quests={quests}
            questHistory={questHistory}
            events={events}
            memories={serinMemories}
            mainQuests={mainQuests}
            contacts={contacts}
            diaryEntries={diaryEntries}
          />
        )}
        {activeView === "bedroom" && (
          <BedroomPage
            serin={snapshot.serin}
            diaryEntries={diaryEntries}
            todayEvents={todayEvents}
            todayCompletedQuests={todayCompletedQuests}
            mainQuestUpdatesToday={mainQuestUpdatesToday}
            onSaveDiary={saveDiaryEntry}
          />
        )}
        {activeView === "garden" && (
          <GardenPage serin={snapshot.serin} onBackToCastle={() => setActiveView("castle")} />
        )}
        {activeView === "throne" && <ThronePage data={appData} />}
        {activeView === "relationship" && <RelationshipPage contacts={contacts} mainQuests={mainQuests} />}
        {activeView === "quests" && (
          <QuestScreen
            quests={quests}
            mainQuests={mainQuests}
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
            onCreateEvent={createCalendarEvent}
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
      </main>

      <BottomNav activeView={activeView} onChange={setActiveView} />
    </div>
  );
}
