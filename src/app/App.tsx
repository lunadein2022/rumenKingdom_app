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
  updateEvent,
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

// 吏㏃? 湲띿젙/遺???듬??쇰줈 吏곸쟾 pendingAction???댁뼱??泥섎━?섍린 ?꾪븳 媛먯?湲?
// "??, "洹몃옒", "?뱀뿰?섏?", "遺?곹빐", "?깅줉??, "?쇱젙???ｌ뼱" 媛숈? ?쒗쁽???ы븿?⑸땲??
const SHORT_AFFIRM = /^(응|그래|당연|좋아|부탁해|해줘|등록해|넣어줘|진행해|확인|ㅇㅇ|ok|okay)$/i;
const SHORT_DECLINE = /^(아니|괜찮아|취소|하지 마|하지마|됐어|보류)$/i;

// "?댁씪 萸먰븯??, "?ㅻ뒛 ?쇱젙 ?덉뼱?", "紐⑤젅 諛붾튌?" 媛숈? 議고쉶??吏덈Ц??媛먯??⑸땲??
// ?깅줉(calendarTriggerPattern)???꾨땲??"?대? ?덈뒗 ?쇱젙??臾쇱뼱蹂대뒗" 寃쎌슦?대?濡?
// ?몃┛??留ㅻ쾲 ?묎컳? ?덈궡臾?????ㅼ젣 events ?곗씠?곕? 湲곗??쇰줈 ?듯빀?덈떎.
const SCHEDULE_QUERY_WORDS = /(뭐\s*있|뭐야|무슨\s*일정|일정\s*있|일정\s*뭐|알려줘|브리핑|바빠|비어)/;
const SCHEDULE_DAY_WORDS = /(오늘|내일|모레)/;
// "?ㅻ뒛 萸??댁빞 ?섏??", "?????뚮젮以? 媛숈? ?섏뒪??議고쉶 吏덈Ц 媛먯?湲?
const QUEST_QUERY_WORDS = /(뭐\s*해야|할\s*일\s*뭐|퀘스트\s*뭐|todo\s*뭐|남은\s*일)/i;

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
      ? "좋은 아침입니다, 공주님. 오늘도 제가 곁에서 차분히 챙기겠습니다."
      : hour < 18
        ? "공주님, 오늘의 흐름을 함께 보고 있어요. 필요한 일이 있으면 편하게 말씀해주세요."
        : "공주님, 오늘 하루도 정말 수고하셨어요. 정리할 일이 있으면 제가 조용히 도와드리겠습니다.";
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
    return `네, 공주님. '${action.title}' Quest를 등록해두었습니다. 잊지 않도록 제가 곁에서 챙기겠습니다.`;
  }
  if (action.intent === "calendar.create") {
    return `네, 공주님. '${action.title}' 일정을 등록해두었습니다. 시간에 맞춰 기억해둘게요.`;
  }
  if (action.intent === "project.create") {
    return `네, 공주님. '${action.title}'을 메인 Quest로 집무실에 등록해두었습니다.`;
  }
  if (action.intent === "project.update") {
    return `네, 공주님. '${action.title}' 프로젝트 업데이트를 기록해두었습니다.`;
  }
  if (action.intent === "memory.save") {
    return "기억해둘게요, 공주님. 다음 대화와 일정 정리에 참고하겠습니다.";
  }
  if (action.intent === "diary.create" || action.intent === "diary.summarize") {
    return "네, 공주님. 다이어리 초안을 침실에 정리해두었습니다.";
  }
  if (action.intent === "contact.extract") {
    return `네, 공주님. '${action.title}'을 인연록에 저장해두었습니다.`;
  }
  if (action.intent === "calendar.update") {
    return `네, 공주님. '${action.title}' 일정을 수정해두었습니다.`;
  }
  if (action.intent === "calendar.delete") {
    return `네, 공주님. '${action.title}' 일정을 취소해두었습니다.`;
  }
  if (action.intent === "quest.update") {
    return `네, 공주님. '${action.title}' Quest를 수정해두었습니다.`;
  }
  if (action.intent === "quest.complete") {
    return `네, 공주님. '${action.title}' Quest를 완료 처리했습니다. 수고 많으셨어요.`;
  }
  if (action.intent === "quest.delete") {
    return `네, 공주님. '${action.title}'을 목록에서 삭제해두었습니다.`;
  }
  if (action.intent === "project.rename") {
    return "네, 공주님. 프로젝트 이름을 바꿔두었습니다.";
  }
  if (action.intent === "diary.update") {
    return "네, 공주님. 침실에서 바로 수정하실 수 있게 열어두었습니다.";
  }
  return `네, 공주님. '${action.title}' 요청을 처리해두었습니다.`;
}

function buildProactiveSuggestion(action: SerinAction): string | null {
  if (action.intent === "project.create") {
    return `'${action.title}' 프로젝트의 첫 단계를 바로 만들어둘까요? 세린이 흐름을 같이 정리해드릴게요.`;
  }
  if (action.intent === "calendar.create" && action.payload.calendar?.category === "meeting") {
    return "회의가 끝나면 오늘 일기 초안에도 정리해드릴까요? 나중에 '오늘 회의 정리'라고 말씀해주세요.";
  }
  if (action.intent === "calendar.create" && action.payload.calendar?.endAt && action.payload.calendar.endAt.slice(0, 10) !== action.payload.calendar.startAt.slice(0, 10)) {
    return "기간 일정과 관련해 미리 준비할 일이 있으면 퀘스트로도 정리해드릴 수 있어요.";
  }
  return null;
}

const actionLogDomainMeta: Record<SerinActionLogEntry["domain"], { icon: string; label: string }> = {
  calendar: { icon: "Calendar", label: "일정" },
  quest: { icon: "Quest", label: "Quest" },
  project: { icon: "Project", label: "프로젝트" },
  diary: { icon: "Diary", label: "다이어리" },
  memory: { icon: "Memory", label: "세린 기억" },
  relationship: { icon: "Relation", label: "인연록" },
  library: { icon: "Library", label: "왕국도서관" },
};

function buildActionLogMessage(entries: SerinActionLogEntry[]): string {
  const body = entries
    .map((entry) => {
      const meta = actionLogDomainMeta[entry.domain];
      return `${meta.icon} ${meta.label} - ${entry.label}\n${entry.detail}`;
    })
    .join("\n\n");
  return `세린이 처리한 작업이에요, 공주님.\n\n${body}`;
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
    description: payload.description ?? "?몃┛????붿뿉???뺣━??Quest?낅땲??",
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

// ?몃┛??湲곗뼲???ъ슜?먭? ?ㅼ젣濡?留먰븳 寃껊쭔 議댁옱?⑸땲?? 珥덇린媛믪? 鍮꾩뼱 ?덉뒿?덈떎.
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
  // ?붾㈃ 梨꾪똿? ?몄뀡 ?쒖젙?낅땲?? ?덈줈怨좎묠?섎㈃ ?댁쟾 ??붾뒗 ?щ씪吏怨????몄궗遺???쒖옉?⑸땲??
  // (?κ린 湲곗뼲? 蹂꾨룄濡?serinMemories????λ릺???덈줈怨좎묠?대룄 ?⑥븘 ?덉뒿?덈떎.)
  const [messages, setMessages] = useState<SerinMessage[]>(() => [buildTimeGreeting()]);
  const [serinStatus, setSerinStatus] = useState<SerinStatus>("idle");
  const [pendingSerinAction, setPendingSerinAction] = useState<SerinAction | null>(null);
  const [serinMemories, setSerinMemories] = useState<SerinMemory[]>(initialSerinMemories);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  // ?몃┛???ㅼ젣濡?臾댁뾿???덈뒗吏 ?щ챸?섍쾶 蹂댁뿬二쇰뒗 ?됰룞 濡쒓렇?낅땲?? 理쒓렐 ??ぉ??  // ?욎뿉 ?ㅻ룄濡??볤퀬, ?쇱そ ?⑤꼸????꾨씪?멸낵 ??붿갹 ???곸꽭 ?댁뿭 ???ㅼ뿉 ?곷땲??
  const [actionLog, setActionLog] = useState<SerinActionLogEntry[]>([]);
  // "?댁젣 ?쇨린 ?섏젙?좉쾶" 媛숈? diary.update ?뺤씤 ?? 移⑥떎 ?붾㈃???대뒓 ?좎쭨瑜?  // ?댁뼱??蹂댁뿬以섏빞 ?섎뒗吏 ?꾨떖?섎뒗 ?좏샇?낅땲??
  const [diaryFocusTarget, setDiaryFocusTarget] = useState<"today" | "yesterday" | null>(null);
  // ?몃┛??湲곗〈 Quest/?쇱젙??"?섏젙/??젣"濡??댁꽍?????ㅼ젣 ??ぉ怨?留ㅼ묶?섍린 ?꾪븳
  // 李몄“ 紐⑸줉?낅땲?? 留?硫붿떆吏 ?꾩넚 ??理쒖떊 ?곹깭 湲곗??쇰줈 ?ㅼ떆 留뚮벊?덈떎.
  const questRefs = useMemo(() => quests.map((quest) => ({ id: quest.id, title: quest.title })), [quests]);
  const eventRefs = useMemo(() => events.map((event) => ({ id: event.id, title: event.title })), [events]);
  // TODO(Alpha ?댄썑): 吏湲덉? ?몃┛ ??붽? ?덈줈怨좎묠 ???꾨? ?щ씪吏???몄뀡 ?쒖젙 mock
  // 援ъ“?낅땲?? saveMessage/getMessages???대? ?몄텧?섍퀬 ?덉?留??ㅼ젣濡쒕뒗 ?꾨Т寃껊룄
  // ??ν븯吏 ?딅뒗 ?ㅽ뀅?낅땲?? Supabase ?곕룞 ????conversationId濡??ㅼ젣 硫붿떆吏 湲곕줉??  // ?쎄퀬 ?곕룄濡?援먯껜?섍퀬, ???쒖옉 ??getMessages 寃곌낵濡?messages 珥덇린媛믪쓣 梨꾩썙???⑸땲??
  const conversationId = useMemo(() => "mock-serin-conversation", []);
  // Castle? ?닿툑 ?쒖뒪?쒖씠 ?녿뒗 ?쒖닔 怨듦컙 ?대룞 ?덈툕?낅땲?? castleRooms??諛?紐⑸줉怨?  // "吏湲??대뒓 諛⑹뿉 ?덈뒗吏"(currentRoomKey, 誘몃땲留??섏씠?쇱씠?몄슜)留?愿由ы빀?덈떎.
  const castleRooms = useCastleRooms(snapshot.rooms);
  const progress = useMemo(() => buildProgress(quests, progressBase), [quests, progressBase]);

  // ?? Supabase ?몄쬆 & ?곸냽??????????????????????????????????????????????
  // supabase env媛 ?놁쑝硫?濡쒖뺄 mock 紐⑤뱶) ?몄쬆/??μ쓣 嫄대꼫?곷땲??
  const supabaseOn = isSupabaseEnabled();
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(!supabaseOn);
  // 'idle' ??'loading' ??'ready'. 'ready' ?댄썑?먮쭔 ?곹깭 蹂寃쎌쓣 DB濡??숆린?뷀빀?덈떎
  // (珥덇린 鍮??곹깭媛 ?ㅼ닔濡?DB瑜?鍮꾩슦吏 ?딅룄濡?.
  const [dataPhase, setDataPhase] = useState<"idle" | "loading" | "ready">(supabaseOn ? "idle" : "ready");

  // ?몄뀡 ?뺤씤 + 濡쒓렇??濡쒓렇?꾩썐 援щ룆
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

  // 濡쒓렇?몃릺硫??꾩껜 ?ㅻ깄?룹쓣 遺덈윭? ?곹깭瑜?梨꾩썎?덈떎.
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

  // ?꾨찓?몃퀎 write-through: 'ready' ?댄썑 媛?而щ젆?섏씠 諛붾뚮㈃ DB? ?숆린?뷀빀?덈떎.
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
    // ??붾갑???ㅼ젣濡?留뚮뱾?대몢???먮쫫?낅땲?? 吏湲덉? mock?대씪 ?꾨Т 寃껊룄 ?곸냽?붾릺吏
    // ?딆?留? Supabase ?곕룞 ?????먮━?먯꽌 諛쏆? conversationId濡??욎쑝濡쒖쓽
    // saveMessage/getMessages ?몄텧??援먯껜?섎㈃ ?⑸땲??
    void getOrCreateConversation("mock-user");
  }, []);

  // 泥댄겕諛뺤뒪 toggle: ?꾨즺 泥섎━? ?꾨즺 痍⑥냼(泥댄겕 ?댁젣)瑜?紐⑤몢 ???⑥닔 ?섎굹濡?  // 泥섎━?⑸땲?? mock state(quests/questHistory/progress)? UI媛 利됱떆 ?④퍡
  // 諛섏쁺?섍퀬, ?섏쨷??Supabase update濡?援먯껜???뚮룄 ??吏꾩엯?먮쭔 諛붽씀硫??⑸땲??
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

  function createQuest(input: { title: string; description?: string; type: "daily" | "side"; dueDate: string }) {
    const quest: Quest = {
      id: newId(),
      type: input.type,
      title: input.title,
      description: input.description ?? "",
      status: "pending",
      category: "growth",
      priority: "medium",
      progress: 0,
      expReward: questTypeMeta[input.type].baseExp,
      goldReward: 0,
      dueDate: input.dueDate,
      rewardClaimed: false,
      source: "manual",
    };
    setQuests((current) => [quest, ...current]);
  }

  function updateQuest(id: string, changes: Partial<Quest>) {
    setQuests((current) => current.map((quest) => (quest.id === id ? { ...quest, ...changes } : quest)));
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
    // TODO: Replace with real AI summary call. 吏湲덉? ?ㅻ뒛 ?곗씠?곕? 諛뷀깢?쇰줈 ??    // 媛꾨떒??mock ?붿빟?낅땲??
    const aiSummary = `?ㅻ뒛? ?쇱젙 ${todayEvents.length}嫄? ?꾨즺???섏뒪??${todayCompleted.length}媛쒖? ?④퍡 "${moodLabel}"???섎（??듬땲??`;
    const linkedEventTitles = todayEvents.map((event) => event.title);
    const linkedQuestTitles = todayCompleted.map((quest) => quest.title);
    const linkedMainQuestUpdates = mainQuests.flatMap((mq) =>
      mq.updates.filter((update) => update.date.slice(0, 10) === TODAY).map((update) => update.content),
    );

    // ?ㅻ뒛 ?좎쭨濡??대? 湲곕줉???덉쑝硫??덈줈 留뚮뱾吏 ?딄퀬 洹?湲곕줉??媛깆떊?⑸땲??    // ("?ㅻ뒛 湲곕줉"? ?섎（???섎굹留?議댁옱?댁빞 ?섎?濡?upsert濡?泥섎━?⑸땲??.
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

  // 吏???쇨린 ?섏젙: ?댁슜/湲곕텇留?諛붽퓠?덈떎 (?먮룞 ?붿빟쨌?곌껐 ?곗씠?곕뒗 ?묒꽦 ?뱀씪 湲곗??쇰줈 ?좎?).
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
    // 吏湲덉? mock(?꾨Т寃껊룄 ??ν븯吏 ?딅뒗 ?ㅽ뀅)?댁?留? ?ㅼ젣 ?먮쫫(?꾩넚 ?쒖젏??硫붿떆吏瑜?    // 湲곕줉)? ?대? ?곌껐?대몢?덉뒿?덈떎. Supabase ?곕룞 ???꾨옒 ??saveMessage ?몄텧留?    // ?ㅼ젣 ??μ쑝濡?諛붾뚮㈃ ?⑸땲??
    void saveMessage({ conversationId, ...princessMessage });

    // 吏곸쟾???몃┛???뺤씤??臾쇱뼱蹂??곹깭(pendingAction)?먯꽌 "??, "洹몃옒", "?뱀뿰?섏?", "遺?곹빐",
    // "?깅줉?? 媛숈? 吏㏃? ?듬????ㅻ㈃, ?덈줈 ?섎룄瑜??댁꽍?섏? ?딄퀬 洹?pendingAction??諛붾줈 ?댁뼱??    // ?ㅽ뻾?⑸땲?? ("臾댁뾿???깅줉?좎? 紐⑤Ⅴ寃좊떎"???듭쓣 ?섏? ?딄린 ?꾪븿)
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

    // "?ㅻ뒛 萸??댁빞 ?섏??" 媛숈? ?섏뒪??議고쉶 吏덈Ц? ?ㅼ젣 quests ?곹깭瑜?諛붾줈 議고쉶?댁꽌
    // ?듯빀?덈떎. (?깅줉 ?붿껌???꾨땲???대? ?덈뒗 ???쇱쓣 臾쇱뼱蹂대뒗 寃쎌슦)
    if (QUEST_QUERY_WORDS.test(content) && !content.includes("?깅줉") && !content.includes("異붽?")) {
      const pendingToday = quests.filter((quest) => quest.status !== "completed" && quest.dueDate === TODAY);
      const reply =
        pendingToday.length === 0
          ? "怨듭＜?? ?ㅻ뒛 ?⑥? ?섏뒪?멸? ?놁뼱?? ?덈줈 梨숆만 ?쇱씠 ?앷린硫??명븯寃?留먯??댁＜?몄슂."
          : `怨듭＜?? ?ㅻ뒛 ?⑥? ?섏뒪?몃뒗 ${pendingToday.map((quest) => `'${quest.title}'`).join(", ")}?낅땲?? ?섎굹???④퍡 ?뺣━?대뱶由닿쾶??`;
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

    // "?댁씪 萸먰븯?? 媛숈? ?쇱젙 議고쉶 吏덈Ц? AI瑜?嫄곗튂吏 ?딄퀬, ?ㅼ젣 events ?곹깭瑜?諛붾줈
    // 議고쉶?댁꽌 ?듯빀?덈떎. (?깅줉 ?붿껌???꾨땲???대? ?덈뒗 ?쇱젙??臾쇱뼱蹂대뒗 寃쎌슦)
    const scheduleQuery = resolveScheduleQuery(content);
    if (scheduleQuery) {
      const dayEvents = getEventsByDay(events, scheduleQuery.date);
      const reply =
        dayEvents.length === 0
          ? `怨듭＜?? ${scheduleQuery.label}? ?깅줉???쇱젙???놁뼱?? ?명엳 蹂대궡?붾룄 ??寃?媛숈븘??`
          : `怨듭＜?? ${scheduleQuery.label} ?쇱젙? ${dayEvents
              .map((event) => `${event.startAt.slice(11, 16)} ${event.title}`)
              .join(", ")}(??媛 ?덉뼱?? ?쒓컙 留욎떠 梨숆꺼?쒕┫寃뚯슂.`;
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
      if (!result.action && /기억|저장|다음에 참고/.test(content)) {
        setSerinMemories((current) =>
          saveMemory(current, {
            memoryType: "preference",
            content: content.replace(/기억해줘|기억해|저장해줘|저장해|다음에 참고해줘/g, "").trim() || content,
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
            "二꾩넚?⑸땲?? 怨듭＜?? ?쒓? 諛⑷툑 留먯????쒕?濡??댄빐?섏? 紐삵뻽?댁슂. 議곌툑留????뚮젮二쇱떆硫?諛붾줈 ?꾩??쒕━寃좎뒿?덈떎.",
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
      // mainQuestId ?먮━?먮뒗 (?꾩쭅 ?ㅼ젣 寃??UI媛 ?놁뼱) ?꾨줈?앺듃 ?쒕ぉ???ㅼ뼱?듬땲??
      // id ?먮뒗 title ?대뒓 履쎌쑝濡????留ㅼ묶?섎룄濡??????뺤씤?⑸땲??
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
    if (pendingSerinAction.intent === "quest.complete" && pendingSerinAction.payload.questUpdate) {
      const { questId } = pendingSerinAction.payload.questUpdate;
      toggleQuestCompletion(questId, true);
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

    // ?몃┛ ?됰룞 濡쒓렇: "?깅줉?덉뒿?덈떎" ??以꾩씠 ?꾨땲?? ?대쾲???ㅼ젣濡?臾댁뾿???덈뒗吏
    // ?꾨찓?몃퀎濡??④꺼???쇱そ ??꾨씪?멸낵 ??붿갹???④퍡 蹂댁뿬以띾땲??
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

    // ?λ룞???쒖븞: 泥섎━ 寃곌낵 ?ㅼ뿉 ?먯뿰?ㅻ읇寃??ㅼ쓬 ??붾? ?댁뼱媛????덈뒗 ??以꾩쓣
    // ?㏓텤?낅땲?? 蹂꾨룄???뺤씤/痍⑥냼 ?≪뀡???꾨땲??洹몃깷 留먰뭾?좎씠?? 怨듭＜?섏씠
    // 臾댁떆?대룄 ?꾨Т ?쇰룄 ?쇱뼱?섏? ?딆뒿?덈떎.
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
        content: "?뚭쿋?듬땲?? 怨듭＜?? ?대쾲?먮뒗 ?섏뼱媛寃좎뒿?덈떎. ?꾩슂?섏떆硫??몄젣???ㅼ떆 留먯??댁＜?몄슂.",
        createdAt: new Date().toISOString(),
        messageType: "system_notice",
      },
    ]);
    setSerinStatus("idle");
  }

  // 泥⑤??뚯씪 泥섎━ ?뚯씠?꾨씪??Mock): "?낅줈??以? ?덈궡瑜?諛붾줈 蹂댁뿬以 ?? 吏㏃?
  // 吏?????ㅼ젣 遺꾩꽍 寃곌낵 硫붿떆吏瑜?蹂댁뿬以띾땲?? ?ㅼ젣 OCR/STT/臾몄꽌 ?붿빟 API濡?  // 援먯껜?섍린 ?꾧퉴吏??attachmentPipeline.ts??mock 濡쒖쭅??寃곌낵瑜?留뚮벊?덈떎.
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

  if (supabaseOn && !authReady) {
    return <div className="app-splash">공주님의 왕국을 여는 중...</div>;
  }
  if (supabaseOn && !userId) {
    return <LoginScreen />;
  }
  if (supabaseOn && dataPhase !== "ready") {
    return <div className="app-splash">공주님의 기록을 불러오는 중...</div>;
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
            onCreateQuest={createQuest}
            onUpdateQuest={updateQuest}
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
            onUpdateEvent={(id, input) => setEvents((current) => updateEvent(current, id, input))}
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

      {/* ?몃┛ 硫붿씠?쒕큸: Serin ?붾㈃(?묒젒?? ?먯껜瑜?蹂??뚮뒗 援녹씠 ???꾩슦吏 ?딄퀬,
          洹???紐⑤뱺 ?붾㈃?먯꽌 ?곗륫 ?섎떒??理쒖냼?붾맂 梨꾨줈 ?④퍡 ?덉뒿?덈떎. */}
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

