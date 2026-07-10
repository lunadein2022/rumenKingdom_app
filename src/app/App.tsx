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
import { GameTopHud } from "../components/design-system/GameTopHud";
import { SiteNav } from "../components/design-system/SiteNav";
import { HomeScene } from "../components/home/HomeScene";
import { QuestScreen } from "../components/modules/QuestScreen";
import { SerinScreen } from "../components/modules/SerinScreen";
import { buildMockProgress } from "../data/mockProgress";
import { getPrincessOsSnapshot } from "../data/mockRepository";
import { createQuestFromCalendarEvent, questTypeMeta, setQuestCompletion } from "../domain/questDomain";
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
import { RelationshipPage } from "../features/relationship/pages/RelationshipPage";
import { ThronePage } from "../features/throne/pages/ThronePage";
import { cancelAction, confirmAction } from "../features/serin/services/serinActionExecutor";
import {
  getOrCreateConversation,
  saveMessage,
  sendMessage as sendSerinDomainMessage,
} from "../features/serin/services/serinService";
import { saveMemory } from "../features/serin/services/serinMemoryService";
import { buildProcessingNotice, runAttachmentPipeline } from "../features/serin/services/attachmentPipeline";
import { SerinFloatingWidget } from "../features/serin/components/SerinFloatingWidget";
import type { SerinActionLogEntry } from "../features/serin/types/serin.types";
import { addDays, getKoreanToday } from "./dateUtils";
import { newId } from "./ids";
import { LoginScreen } from "../features/auth/LoginScreen";
import { getCurrentSession, isSupabaseEnabled, onAuthChange, signOut } from "../services/supabase/authService";
import {
  loadSnapshot,
  syncContacts,
  syncDiary,
  syncEvents,
  syncMainQuests,
  syncMemories,
  syncProgress,
  syncQuestHistory,
  syncQuests,
} from "../services/supabase/dataService";

const TODAY = getKoreanToday();

// 짧은 긍정/부정 답변으로 직전 pendingAction을 이어서 처리하기 위한 감지기.
// "응", "그래", "당연하지", "부탁해", "등록해", "일정에 넣어" 같은 표현을 포함합니다.
const SHORT_AFFIRM = /(응|어|그래|당연|부탁|등록해|넣어줘|넣어|좋아|네|넵|콜|오케이|ok)/i;
const SHORT_DECLINE = /(아니|괜찮아|괜찮습니다|취소|하지\s*마|넘어가)/i;

// "내일 뭐하나", "오늘 일정 있어?", "모레 바빠?" 같은 조회성 질문을 감지합니다.
// 등록(calendarTriggerPattern)이 아니라 "이미 있는 일정을 물어보는" 경우이므로,
// 세린이 매번 똑같은 안내문 대신 실제 events 데이터를 기준으로 답합니다.
const SCHEDULE_QUERY_WORDS = /(뭐\s?하|뭐\s?있|무슨\s?일|일정\s?있|일정\s?뭐|일정\s?알려|일정\s?브리핑|스케줄\s?있|스케줄\s?알려|바쁘|바빠)/;
const SCHEDULE_DAY_WORDS = /(오늘|내일|모레)/;
// "오늘 뭐 해야 되지?", "할 일 알려줘" 같은 퀘스트 조회 질문 감지기.
const QUEST_QUERY_WORDS = /(뭐\s?해야|할\s?일\s?(있|뭐|알려)|퀘스트\s?(있|뭐|알려))/;

function isShortReply(text: string) {
  return text.trim().length > 0 && text.trim().length <= 14;
}

function resolveScheduleQuery(content: string): { date: string; label: string } | null {
  if (!SCHEDULE_DAY_WORDS.test(content) || !SCHEDULE_QUERY_WORDS.test(content)) return null;
  if (content.includes("모레")) return { date: addDays(TODAY, 2), label: "모레" };
  if (content.includes("내일")) return { date: addDays(TODAY, 1), label: "내일" };
  return { date: TODAY, label: "오늘" };
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
  if (action.intent === "calendar.update") {
    return `네, 공주님. '${action.title}' 일정을 옮겨두었습니다.`;
  }
  if (action.intent === "calendar.delete") {
    return `네, 공주님. '${action.title}' 일정을 취소해두었습니다.`;
  }
  if (action.intent === "quest.update") {
    return `네, 공주님. '${action.title}' 퀘스트 내용을 반영해두었습니다.`;
  }
  if (action.intent === "quest.delete") {
    return `네, 공주님. '${action.title}'을(를) 목록에서 지워두었습니다.`;
  }
  if (action.intent === "project.rename") {
    return `네, 공주님. 프로젝트 이름을 바꿔두었습니다.`;
  }
  if (action.intent === "diary.update") {
    return `네, 공주님. 침실에서 바로 이어 쓰실 수 있게 열어두었습니다.`;
  }
  return `네, 공주님. '${action.title}' 요청을 처리해두었습니다.`;
}

// 능동적 제안: 확정 직후, 하드한 확인/취소 액션이 아니라 부드러운 텍스트
// 제안 한 줄을 덧붙입니다. "대화가 먼저, 버튼은 보조" 철학에 맞춰, 이 제안은
// 그냥 말풍선일 뿐이고 공주님이 실제로 다음 문장을 말해야 이어집니다
// (자동으로 또 다른 확인 카드를 띄우지 않습니다).
function buildProactiveSuggestion(action: SerinAction): string | null {
  if (action.intent === "project.create") {
    return `'${action.title}' 프로젝트에 바로 첫 할 일을 만들어볼까요? "${action.title}에 킥오프 회의 준비해야 돼"처럼 말씀해주시면 알아서 연결해드릴게요.`;
  }
  if (action.intent === "calendar.create" && action.payload.calendar?.category === "meeting") {
    return "미팅이 끝나면 오늘 일기에 정리해드릴까요? 나중에 \"오늘 일기 써줘\"라고 말씀해주시면 반영해드릴게요.";
  }
  if (action.intent === "calendar.create" && action.payload.calendar?.endAt && action.payload.calendar.endAt.slice(0, 10) !== action.payload.calendar.startAt.slice(0, 10)) {
    return "기간 일정과 관련해서 미리 준비할 게 있으면 \"~해야 돼\"라고 말씀해주세요. 퀘스트로 정리해드릴게요.";
  }
  return null;
}

// 도메인별 아이콘/이름표. Action Log를 "등록했습니다" 한 줄이 아니라 무엇을
// 어떻게 바꿨는지 도메인별로 투명하게 보여주기 위해 씁니다.
const actionLogDomainMeta: Record<SerinActionLogEntry["domain"], { icon: string; label: string }> = {
  calendar: { icon: "📅", label: "Calendar" },
  quest: { icon: "✅", label: "Quest" },
  project: { icon: "📁", label: "Project" },
  diary: { icon: "📔", label: "Diary" },
  memory: { icon: "🧠", label: "Memory" },
  relationship: { icon: "🤝", label: "인연록" },
  library: { icon: "📚", label: "도서관" },
};

function buildActionLogMessage(entries: SerinActionLogEntry[]): string {
  const body = entries
    .map((entry) => {
      const meta = actionLogDomainMeta[entry.domain];
      return `${meta.icon} ${meta.label} · ${entry.label}\n${entry.detail}`;
    })
    .join("\n\n");
  return `세린이 처리한 작업이에요, 공주님\n\n${body}`;
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
    id: newId(),
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
    id: newId(),
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

// 세린의 기억도 사용자가 실제로 말한 것만 존재합니다. 초기값은 비어 있습니다.
const initialSerinMemories: SerinMemory[] = [];

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
  // 세린이 실제로 무엇을 했는지 투명하게 보여주는 행동 로그입니다. 최근 항목이
  // 앞에 오도록 쌓고, 왼쪽 패널의 타임라인과 대화창 안 상세 내역 둘 다에 씁니다.
  const [actionLog, setActionLog] = useState<SerinActionLogEntry[]>([]);
  // "어제 일기 수정할게" 같은 diary.update 확인 후, 침실 화면이 어느 날짜를
  // 열어서 보여줘야 하는지 전달하는 신호입니다.
  const [diaryFocusTarget, setDiaryFocusTarget] = useState<"today" | "yesterday" | null>(null);
  // 세린이 기존 Quest/일정을 "수정/삭제"로 해석할 때 실제 항목과 매칭하기 위한
  // 참조 목록입니다. 매 메시지 전송 시 최신 상태 기준으로 다시 만듭니다.
  const questRefs = useMemo(() => quests.map((quest) => ({ id: quest.id, title: quest.title })), [quests]);
  const eventRefs = useMemo(() => events.map((event) => ({ id: event.id, title: event.title })), [events]);
  // TODO(Alpha 이후): 지금은 세린 대화가 새로고침 시 전부 사라지는 세션 한정 mock
  // 구조입니다. saveMessage/getMessages는 이미 호출되고 있지만 실제로는 아무것도
  // 저장하지 않는 스텁입니다. Supabase 연동 시 이 conversationId로 실제 메시지 기록을
  // 읽고 쓰도록 교체하고, 앱 시작 시 getMessages 결과로 messages 초기값을 채워야 합니다.
  const conversationId = useMemo(() => "mock-serin-conversation", []);
  // Castle은 해금 시스템이 없는 순수 공간 이동 허브입니다. castleRooms는 방 목록과
  // "지금 어느 방에 있는지"(currentRoomKey, 미니맵 하이라이트용)만 관리합니다.
  const castleRooms = useCastleRooms(snapshot.rooms);
  const progress = useMemo(() => buildProgress(quests, progressBase), [quests, progressBase]);

  // ── Supabase 인증 & 영속화 ────────────────────────────────────────────
  // supabase env가 없으면(로컬 mock 모드) 인증/저장을 건너뜁니다.
  const supabaseOn = isSupabaseEnabled();
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(!supabaseOn);
  // 'idle' → 'loading' → 'ready'. 'ready' 이후에만 상태 변경을 DB로 동기화합니다
  // (초기 빈 상태가 실수로 DB를 비우지 않도록).
  const [dataPhase, setDataPhase] = useState<"idle" | "loading" | "ready">(supabaseOn ? "idle" : "ready");

  // 세션 확인 + 로그인/로그아웃 구독
  useEffect(() => {
    if (!supabaseOn) return;
    let unsub = () => {};
    void getCurrentSession().then((session) => {
      setUserId(session?.user?.id ?? null);
      setAuthReady(true);
      unsub = onAuthChange((user) => {
        setUserId(user?.id ?? null);
        if (!user) setDataPhase("idle");
      });
    });
    return () => unsub();
  }, [supabaseOn]);

  // 로그인되면 전체 스냅샷을 불러와 상태를 채웁니다.
  useEffect(() => {
    if (!supabaseOn || !userId) return;
    setDataPhase("loading");
    void loadSnapshot(userId).then((snap) => {
      setQuests(snap.quests);
      setQuestHistory(snap.questHistory);
      setEvents(snap.events);
      setMainQuests(snap.mainQuests);
      setSerinMemories(snap.memories);
      setContacts(snap.contacts);
      setDiaryEntries(snap.diaryEntries);
      if (snap.progressBase) {
        setProgressBase((current) => ({ ...current, ...snap.progressBase }));
      }
      setDataPhase("ready");
    });
  }, [supabaseOn, userId]);

  // 도메인별 write-through: 'ready' 이후 각 컬렉션이 바뀌면 DB와 동기화합니다.
  const canSync = supabaseOn && userId !== null && dataPhase === "ready";
  useEffect(() => { if (canSync) void syncQuests(userId!, quests); }, [canSync, quests]);
  useEffect(() => { if (canSync) void syncQuestHistory(userId!, questHistory); }, [canSync, questHistory]);
  useEffect(() => { if (canSync) void syncEvents(userId!, events); }, [canSync, events]);
  useEffect(() => { if (canSync) void syncMainQuests(userId!, mainQuests); }, [canSync, mainQuests]);
  useEffect(() => { if (canSync) void syncMemories(userId!, serinMemories); }, [canSync, serinMemories]);
  useEffect(() => { if (canSync) void syncContacts(userId!, contacts); }, [canSync, contacts]);
  useEffect(() => { if (canSync) void syncDiary(userId!, diaryEntries); }, [canSync, diaryEntries]);
  useEffect(() => { if (canSync) void syncProgress(userId!, progress); }, [canSync, progress]);
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

  // 체크박스 toggle: 완료 처리와 완료 취소(체크 해제)를 모두 이 함수 하나로
  // 처리합니다. mock state(quests/questHistory/progress)와 UI가 즉시 함께
  // 반영되고, 나중에 Supabase update로 교체할 때도 이 진입점만 바꾸면 됩니다.
  function toggleQuestCompletion(id: string, completed: boolean) {
    const result = setQuestCompletion(quests, questHistory, id, completed, progress);
    setQuests(result.quests);
    setQuestHistory(result.history);
    setCompletionEvents(result.events);
    setProgressBase(result.progress);
  }

  function deleteQuest(id: string) {
    setQuests((current) => current.filter((quest) => quest.id !== id));
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
    // TODO: Replace with real AI summary call. 지금은 오늘 데이터를 바탕으로 한
    // 간단한 mock 요약입니다.
    const aiSummary = `오늘은 일정 ${todayEvents.length}건, 완료한 퀘스트 ${todayCompleted.length}개와 함께 "${moodLabel}"한 하루였습니다.`;
    const linkedEventTitles = todayEvents.map((event) => event.title);
    const linkedQuestTitles = todayCompleted.map((quest) => quest.title);
    const linkedMainQuestUpdates = mainQuests.flatMap((mq) =>
      mq.updates.filter((update) => update.date.slice(0, 10) === TODAY).map((update) => update.content),
    );

    // 오늘 날짜로 이미 기록이 있으면 새로 만들지 않고 그 기록을 갱신합니다
    // ("오늘 기록"은 하루에 하나만 존재해야 하므로 upsert로 처리합니다).
    setDiaryEntries((current) => {
      const existingIndex = current.findIndex((entry) => entry.date === TODAY);
      if (existingIndex >= 0) {
        const updated = [...current];
        updated[existingIndex] = {
          ...updated[existingIndex],
          content,
          moodEmoji,
          moodLabel,
          aiSummary,
          linkedEventTitles,
          linkedQuestTitles,
          linkedMainQuestUpdates,
        };
        return updated;
      }
      const entry: DiaryEntry = {
        id: newId(),
        date: TODAY,
        moodEmoji,
        moodLabel,
        content,
        aiSummary,
        linkedEventTitles,
        linkedQuestTitles,
        linkedMainQuestUpdates,
      };
      return [entry, ...current];
    });
  }

  // 지난 일기 수정: 내용/기분만 바꿉니다 (자동 요약·연결 데이터는 작성 당일 기준으로 유지).
  function updateDiaryEntry(id: string, content: string, moodEmoji: string, moodLabel: string) {
    setDiaryEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, content, moodEmoji, moodLabel } : entry)),
    );
  }

  function deleteDiaryEntry(id: string) {
    setDiaryEntries((current) => current.filter((entry) => entry.id !== id));
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

    // "오늘 뭐 해야 되지?" 같은 퀘스트 조회 질문은 실제 quests 상태를 바로 조회해서
    // 답합니다. (등록 요청이 아니라 이미 있는 할 일을 물어보는 경우)
    if (QUEST_QUERY_WORDS.test(content) && !content.includes("등록") && !content.includes("추가")) {
      const pendingToday = quests.filter((quest) => quest.status !== "completed" && quest.dueDate === TODAY);
      const reply =
        pendingToday.length === 0
          ? "공주님, 오늘 남은 퀘스트가 없어요. 새로 챙길 일이 생기면 편하게 말씀해주세요."
          : `공주님, 오늘 남은 퀘스트는 ${pendingToday.map((quest) => `'${quest.title}'`).join(", ")}입니다. 하나씩 함께 정리해드릴게요.`;
      const questQueryMessage: SerinMessage = {
        id: `m-${Date.now()}-questquery`,
        sender: "serin",
        content: reply,
        createdAt: new Date().toISOString(),
        messageType: "text",
      };
      setMessages((current) => [...current, questQueryMessage]);
      void saveMessage({ conversationId, ...questQueryMessage });
      return;
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
        {
          conversationId,
          content,
          mainQuestTitles: mainQuests.map((mq) => mq.title),
          questRefs,
          eventRefs,
        },
        recentHistory,
      );
      // Claude가 memory.save 액션을 만들어온 경우에는 확인 후 저장되므로,
      // 여기서는 액션 없이 "기억" 키워드만 있는 경우에만 즉시 저장합니다(이중 저장 방지).
      if (!result.action && content.includes("기억")) {
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
    if (pendingSerinAction.intent === "calendar.update" && pendingSerinAction.payload.calendarUpdate) {
      const { eventId, changes } = pendingSerinAction.payload.calendarUpdate;
      setEvents((current) => current.map((event) => (event.id === eventId ? { ...event, ...changes } : event)));
    }
    if (pendingSerinAction.intent === "calendar.delete" && pendingSerinAction.payload.calendarDelete) {
      const { eventId } = pendingSerinAction.payload.calendarDelete;
      setEvents((current) => deleteEvent(current, eventId));
    }
    if (pendingSerinAction.intent === "quest.update" && pendingSerinAction.payload.questUpdate) {
      const { questId, changes } = pendingSerinAction.payload.questUpdate;
      if (Object.keys(changes).length > 0) {
        setQuests((current) => current.map((quest) => (quest.id === questId ? { ...quest, ...changes } : quest)));
      }
    }
    if (pendingSerinAction.intent === "quest.delete" && pendingSerinAction.payload.questDelete) {
      const { questId } = pendingSerinAction.payload.questDelete;
      const resolvedId = questId === "__last__" ? quests[0]?.id : questId;
      if (resolvedId) setQuests((current) => current.filter((quest) => quest.id !== resolvedId));
    }
    if (pendingSerinAction.intent === "project.rename" && pendingSerinAction.payload.mainQuestRename) {
      const { mainQuestId, newTitle } = pendingSerinAction.payload.mainQuestRename;
      setMainQuests((current) =>
        current.map((mq) => (mq.id === mainQuestId || mq.title === mainQuestId ? { ...mq, title: newTitle } : mq)),
      );
    }
    if (pendingSerinAction.intent === "diary.update" && pendingSerinAction.payload.diaryEdit) {
      const { entryId } = pendingSerinAction.payload.diaryEdit;
      setDiaryFocusTarget(entryId === "yesterday" ? "yesterday" : "today");
      setActiveView("bedroom");
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

    // 세린 행동 로그: "등록했습니다" 한 줄이 아니라, 이번에 실제로 무엇을 했는지
    // 도메인별로 남겨서 왼쪽 타임라인과 대화창에 함께 보여줍니다.
    if (pendingSerinAction.logEntries && pendingSerinAction.logEntries.length > 0) {
      const stampBase = Date.now();
      const newLogEntries: SerinActionLogEntry[] = pendingSerinAction.logEntries.map((entry, index) => ({
        ...entry,
        id: `log-${stampBase}-${index}`,
        timestamp: new Date().toISOString(),
      }));
      setActionLog((current) => [...newLogEntries, ...current].slice(0, 50));
      setMessages((current) => [
        ...current,
        {
          id: `m-${stampBase}-actionlog`,
          sender: "serin",
          content: buildActionLogMessage(newLogEntries),
          createdAt: new Date().toISOString(),
          messageType: "action_log",
        },
      ]);
    }

    // 능동적 제안: 처리 결과 뒤에 자연스럽게 다음 대화를 이어갈 수 있는 한 줄을
    // 덧붙입니다. 별도의 확인/취소 액션이 아니라 그냥 말풍선이라, 공주님이
    // 무시해도 아무 일도 일어나지 않습니다.
    const suggestion = buildProactiveSuggestion(pendingSerinAction);
    if (suggestion) {
      setMessages((current) => [
        ...current,
        {
          id: `m-${Date.now()}-suggestion`,
          sender: "serin",
          content: suggestion,
          createdAt: new Date().toISOString(),
          messageType: "text",
        },
      ]);
    }

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

  // 첨부파일 처리 파이프라인(Mock): "업로드 중" 안내를 바로 보여준 뒤, 짧은
  // 지연 후 실제 분석 결과 메시지를 보여줍니다. 실제 OCR/STT/문서 요약 API로
  // 교체하기 전까지는 attachmentPipeline.ts의 mock 로직이 결과를 만듭니다.
  function handleAttach(type: "image" | "document" | "audio", fileName?: string) {
    setSerinStatus("thinking");
    setMessages((current) => [
      ...current,
      {
        id: `m-${Date.now()}-attach-notice`,
        sender: "serin",
        content: buildProcessingNotice(type, fileName),
        createdAt: new Date().toISOString(),
        messageType: "system_notice",
      },
    ]);

    window.setTimeout(() => {
      const { resultMessage, suggestedAction } = runAttachmentPipeline(type, fileName);
      setMessages((current) => [
        ...current,
        {
          id: `m-${Date.now()}-attach-result`,
          sender: "serin",
          content: resultMessage,
          createdAt: new Date().toISOString(),
          messageType: suggestedAction ? "confirmation" : "system_notice",
          metadata: suggestedAction ? { actionId: suggestedAction.id, intent: suggestedAction.intent } : undefined,
        },
      ]);
      if (suggestedAction) setPendingSerinAction(suggestedAction);
      setSerinStatus("idle");
    }, 650);
  }

  const todayEvents = getEventsByDay(events, TODAY);
  const todayCompletedQuests = quests.filter((quest) => quest.status === "completed" && quest.dueDate === TODAY);
  const mainQuestUpdatesToday = mainQuests.flatMap((mainQuest) =>
    mainQuest.updates.filter((update) => update.date.slice(0, 10) === TODAY).map((update) => ({ mainQuest, content: update.content })),
  );

  // 인증 게이트 (supabase 사용 시): 세션 확인 중 → 스플래시, 미로그인 → 로그인 화면,
  // 데이터 로딩 중 → 스플래시. 그 뒤 앱 본체를 렌더합니다.
  if (supabaseOn && !authReady) {
    return <div className="app-splash">공주님의 왕궁을 여는 중…</div>;
  }
  if (supabaseOn && !userId) {
    return <LoginScreen />;
  }
  if (supabaseOn && dataPhase !== "ready") {
    return <div className="app-splash">공주님의 기록을 불러오는 중…</div>;
  }

  return (
    <div className="app-shell">
      <GameTopHud
        princess={snapshot.princess}
        progress={progress}
        onSignOut={supabaseOn ? () => void signOut() : undefined}
      />
      <SiteNav activeView={activeView} onChange={setActiveView} />

      <main className="app-main">
        {activeView === "home" && (
          <HomeScene
            data={appData}
            rooms={castleRooms.rooms}
            currentRoomKey={castleRooms.currentRoomKey}
            onNavigate={setActiveView}
            onToggleQuest={toggleQuestCompletion}
          />
        )}
        {activeView === "castle" && (
          <CastlePage
            rooms={castleRooms.rooms}
            currentRoomKey={castleRooms.currentRoomKey}
            onNavigate={setActiveView}
            onVisitRoom={castleRooms.visitRoom}
          />
        )}
        {(activeView === "office" || activeView === "quests") && (
          <QuestScreen
            quests={quests}
            mainQuests={mainQuests}
            onToggleQuest={toggleQuestCompletion}
            onDeleteQuest={deleteQuest}
            onAskSerin={() => setActiveView("serin")}
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
            onUpdateDiary={updateDiaryEntry}
            onDeleteDiary={deleteDiaryEntry}
            focusTarget={diaryFocusTarget}
            onFocusConsumed={() => setDiaryFocusTarget(null)}
            todayDate={TODAY}
          />
        )}
        {activeView === "garden" && (
          <GardenPage serin={snapshot.serin} onBackToCastle={() => setActiveView("castle")} />
        )}
        {activeView === "throne" && <ThronePage data={appData} />}
        {activeView === "relationship" && <RelationshipPage contacts={contacts} mainQuests={mainQuests} />}
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
            mainQuests={mainQuests}
            events={events}
            contacts={contacts}
            onSendMessage={sendSerinMessage}
            onConfirmAction={confirmSerinAction}
            onCancelAction={cancelSerinAction}
            onAttach={handleAttach}
          />
        )}
      </main>

      {/* 세린 메이드봇: Serin 화면(응접실) 자체를 볼 때는 굳이 또 띄우지 않고,
          그 외 모든 화면에서 우측 하단에 최소화된 채로 함께 있습니다. */}
      {activeView !== "serin" && (
        <SerinFloatingWidget
          status={serinStatus}
          hasPendingAction={pendingSerinAction !== null}
          onOpenSerin={() => setActiveView("serin")}
          onQuickAsk={(sentence) => {
            setActiveView("serin");
            void sendSerinMessage(sentence);
          }}
        />
      )}
    </div>
  );
}
