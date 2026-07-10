import type {
  CalendarEvent,
  DiaryEntry,
  MainQuest,
  Quest,
  QuestHistoryEntry,
  RelationshipContact,
  SerinMemory,
  UserProgress,
} from "../../app/types";
import { requireSupabase } from "./client";

// ---------------------------------------------------------------------------
// Supabase 실데이터 레이어.
//  - loadSnapshot(userId): 전 도메인을 읽어 앱 모델로 매핑해 돌려줍니다.
//  - sync*(userId, list): 해당 컬렉션을 통째로 DB와 맞춥니다(현재 목록에 없는
//    행은 삭제하고, 나머지는 upsert). 개인 데이터 규모라 이 "전체 동기화" 방식이
//    가장 단순하고, App의 각 mutation을 일일이 고치지 않아도 됩니다.
//  - progress는 단일 행이라 upsert만 합니다.
// 모든 write는 실패 시 조용히 삼키지 않고 콘솔에 남깁니다(낙관적 UI 유지).
// ---------------------------------------------------------------------------

function log(where: string, error: unknown) {
  if (error) console.error(`[supabase:${where}]`, error);
}

// 컬렉션 전체 동기화: 현재 목록에 없는 행 삭제 + 현재 목록 upsert.
async function syncCollection(table: string, userId: string, rows: Array<{ id: string }>) {
  const sb = requireSupabase();
  const ids = rows.map((row) => row.id);
  // 1) 현재 목록에 없는 행 삭제 (uuid는 안전하지만 견고하게 큰따옴표로 감쌉니다)
  if (ids.length > 0) {
    const inList = `(${ids.map((id) => `"${id}"`).join(",")})`;
    const { error } = await sb.from(table).delete().eq("user_id", userId).not("id", "in", inList);
    log(`${table}.deleteMissing`, error);
  } else {
    const { error } = await sb.from(table).delete().eq("user_id", userId);
    log(`${table}.deleteAll`, error);
  }
  // 2) upsert
  if (rows.length > 0) {
    const { error } = await sb.from(table).upsert(rows, { onConflict: "id" });
    log(`${table}.upsert`, error);
  }
}

// ========================= Quests =========================
function questToRow(quest: Quest, userId: string) {
  return {
    id: quest.id,
    user_id: userId,
    type: quest.type,
    title: quest.title,
    description: quest.description,
    status: quest.status,
    category: quest.category,
    priority: quest.priority,
    chapter: quest.chapter ?? null,
    parent_id: quest.mainQuestId ?? null,
    progress: quest.progress,
    exp_reward: quest.expReward,
    gold_reward: quest.goldReward,
    reward_item: quest.rewardItem ?? null,
    due_date: quest.dueDate || null,
    completed_at: quest.completedAt ?? null,
    reward_claimed: quest.rewardClaimed,
  };
}

function rowToQuest(row: Record<string, unknown>): Quest {
  return {
    id: row.id as string,
    type: (row.type as Quest["type"]) ?? "daily",
    title: (row.title as string) ?? "",
    description: (row.description as string) ?? "",
    status: (row.status as Quest["status"]) ?? "pending",
    category: (row.category as Quest["category"]) ?? "growth",
    priority: (row.priority as Quest["priority"]) ?? "medium",
    chapter: (row.chapter as string) ?? undefined,
    mainQuestId: (row.parent_id as string) ?? undefined,
    progress: (row.progress as number) ?? 0,
    expReward: (row.exp_reward as number) ?? 0,
    goldReward: (row.gold_reward as number) ?? 0,
    rewardItem: (row.reward_item as string) ?? undefined,
    dueDate: (row.due_date as string) ?? "",
    completedAt: (row.completed_at as string) ?? undefined,
    rewardClaimed: Boolean(row.reward_claimed),
    source: "manual",
  };
}

export async function syncQuests(userId: string, quests: Quest[]) {
  // daily/side 만 quests 테이블에 저장합니다(메인은 main_quests가 담당).
  await syncCollection("quests", userId, quests.map((q) => questToRow(q, userId)));
}

// ========================= Quest History =========================
export async function syncQuestHistory(userId: string, history: QuestHistoryEntry[]) {
  const rows = history.map((h) => ({
    id: h.id,
    user_id: userId,
    quest_id: h.questId,
    completed_at: h.completedAt,
    reward_exp: h.rewardExp,
    reward_item: h.rewardItem ?? null,
    note: h.note,
  }));
  await syncCollection("quest_history", userId, rows);
}

// ========================= Calendar Events =========================
function eventToRow(event: CalendarEvent, userId: string) {
  return {
    id: event.id,
    user_id: userId,
    title: event.title,
    description: event.description,
    start_at: event.startAt,
    end_at: event.endAt ?? null,
    location: event.location ?? null,
    category: event.category,
    priority: event.priority,
    is_all_day: event.isAllDay,
    reminder_minutes: event.reminderMinutes ?? null,
    linked_quest_id: event.linkedQuestId ?? null,
    status: event.status,
    created_by: event.createdBy,
  };
}

function rowToEvent(row: Record<string, unknown>): CalendarEvent {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    description: (row.description as string) ?? "",
    startAt: row.start_at as string,
    endAt: (row.end_at as string) ?? undefined,
    location: (row.location as string) ?? undefined,
    category: (row.category as CalendarEvent["category"]) ?? "personal",
    priority: (row.priority as CalendarEvent["priority"]) ?? "medium",
    isAllDay: Boolean(row.is_all_day),
    reminderMinutes: (row.reminder_minutes as number) ?? null,
    linkedQuestId: (row.linked_quest_id as string) ?? null,
    status: (row.status as CalendarEvent["status"]) ?? "scheduled",
    createdBy: (row.created_by as CalendarEvent["createdBy"]) ?? "user",
  };
}

export async function syncEvents(userId: string, events: CalendarEvent[]) {
  await syncCollection("calendar_events", userId, events.map((e) => eventToRow(e, userId)));
}

// ========================= Main Quests =========================
function mainQuestToRow(mq: MainQuest, userId: string) {
  return {
    id: mq.id,
    user_id: userId,
    title: mq.title,
    description: mq.description,
    status: mq.status,
    progress: mq.progress,
    priority: mq.priority,
    start_date: mq.startDate || null,
    due_date: mq.dueDate || null,
    chapters: mq.chapters,
    updates: mq.updates,
    sub_quest_ids: mq.subQuestIds,
    daily_quest_ids: mq.dailyQuestIds,
    linked_calendar_event_ids: mq.linkedCalendarEventIds,
    related_contact_ids: mq.relatedContactIds,
    attached_files: mq.attachedFiles,
    reward_exp: mq.rewardExp,
    reward_gold: mq.rewardGold,
    exp_total: mq.expTotal,
    created_at: mq.createdAt,
    updated_at: mq.updatedAt,
  };
}

function rowToMainQuest(row: Record<string, unknown>): MainQuest {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    description: (row.description as string) ?? "",
    status: (row.status as MainQuest["status"]) ?? "active",
    progress: (row.progress as number) ?? 0,
    priority: (row.priority as MainQuest["priority"]) ?? "medium",
    startDate: (row.start_date as string) ?? "",
    dueDate: (row.due_date as string) ?? "",
    chapters: (row.chapters as MainQuest["chapters"]) ?? [],
    updates: (row.updates as MainQuest["updates"]) ?? [],
    subQuestIds: (row.sub_quest_ids as string[]) ?? [],
    dailyQuestIds: (row.daily_quest_ids as string[]) ?? [],
    routineQuestIds: [],
    linkedCalendarEventIds: (row.linked_calendar_event_ids as string[]) ?? [],
    relatedContactIds: (row.related_contact_ids as string[]) ?? [],
    attachedFiles: (row.attached_files as MainQuest["attachedFiles"]) ?? [],
    rewardExp: (row.reward_exp as number) ?? 0,
    rewardGold: (row.reward_gold as number) ?? 0,
    expTotal: (row.exp_total as number) ?? 0,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

export async function syncMainQuests(userId: string, mainQuests: MainQuest[]) {
  await syncCollection("main_quests", userId, mainQuests.map((mq) => mainQuestToRow(mq, userId)));
}

// ========================= Serin Memory =========================
function memoryToRow(memory: SerinMemory, userId: string) {
  return {
    id: memory.id,
    user_id: userId,
    memory_type: memory.memoryType,
    content: memory.content,
    importance: memory.importance,
    source: memory.source,
    related_entity_type: memory.relatedEntityType ?? null,
    related_entity_id: memory.relatedEntityId ?? null,
  };
}

function rowToMemory(row: Record<string, unknown>): SerinMemory {
  return {
    id: row.id as string,
    memoryType: (row.memory_type as SerinMemory["memoryType"]) ?? "preference",
    content: (row.content as string) ?? "",
    importance: (row.importance as SerinMemory["importance"]) ?? "medium",
    source: (row.source as SerinMemory["source"]) ?? "chat",
    relatedEntityType: (row.related_entity_type as string) ?? undefined,
    relatedEntityId: (row.related_entity_id as string) ?? undefined,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
  };
}

export async function syncMemories(userId: string, memories: SerinMemory[]) {
  await syncCollection("serin_memory", userId, memories.map((m) => memoryToRow(m, userId)));
}

// ========================= Contacts =========================
function contactToRow(contact: RelationshipContact, userId: string) {
  return {
    id: contact.id,
    user_id: userId,
    name: contact.name,
    phone: contact.phone ?? null,
    email: contact.email ?? null,
    organization: contact.organization ?? null,
    position: contact.position ?? null,
    memo: contact.memo ?? null,
    source: "serin",
    affinity: contact.affinity,
    related_main_quest_ids: contact.relatedMainQuestIds,
    ai_summary: contact.aiSummary ?? null,
    last_contacted_at: contact.lastContactAt ?? null,
    last_meeting_at: contact.lastMeetingAt ?? null,
  };
}

function rowToContact(row: Record<string, unknown>): RelationshipContact {
  return {
    id: row.id as string,
    name: (row.name as string) ?? "",
    affinity: (row.affinity as number) ?? 3,
    organization: (row.organization as string) ?? undefined,
    position: (row.position as string) ?? undefined,
    phone: (row.phone as string) ?? undefined,
    email: (row.email as string) ?? undefined,
    memo: (row.memo as string) ?? undefined,
    lastContactAt: (row.last_contacted_at as string) ?? undefined,
    lastMeetingAt: (row.last_meeting_at as string) ?? undefined,
    relatedMainQuestIds: (row.related_main_quest_ids as string[]) ?? [],
    aiSummary: (row.ai_summary as string) ?? undefined,
  };
}

export async function syncContacts(userId: string, contacts: RelationshipContact[]) {
  await syncCollection("contacts", userId, contacts.map((c) => contactToRow(c, userId)));
}

// ========================= Diary =========================
function diaryToRow(entry: DiaryEntry, userId: string) {
  return {
    id: entry.id,
    user_id: userId,
    entry_date: entry.date,
    title: "",
    content: entry.content,
    ai_summary: entry.aiSummary ?? null,
    mood: entry.moodLabel,
    mood_emoji: entry.moodEmoji,
    mood_label: entry.moodLabel,
    linked_event_titles: entry.linkedEventTitles,
    linked_quest_titles: entry.linkedQuestTitles,
    linked_main_quest_updates: entry.linkedMainQuestUpdates,
  };
}

function rowToDiary(row: Record<string, unknown>): DiaryEntry {
  return {
    id: row.id as string,
    date: row.entry_date as string,
    moodEmoji: (row.mood_emoji as string) ?? "🙂",
    moodLabel: (row.mood_label as string) ?? (row.mood as string) ?? "평온",
    content: (row.content as string) ?? "",
    aiSummary: (row.ai_summary as string) ?? undefined,
    linkedEventTitles: (row.linked_event_titles as string[]) ?? [],
    linkedQuestTitles: (row.linked_quest_titles as string[]) ?? [],
    linkedMainQuestUpdates: (row.linked_main_quest_updates as string[]) ?? [],
  };
}

export async function syncDiary(userId: string, entries: DiaryEntry[]) {
  await syncCollection("princess_diary", userId, entries.map((e) => diaryToRow(e, userId)));
}

// ========================= Progress (단일 행) =========================
export async function syncProgress(userId: string, progress: UserProgress) {
  const sb = requireSupabase();
  const { error } = await sb.from("user_progress").upsert(
    {
      user_id: userId,
      level: progress.level,
      current_exp: progress.currentExp,
      required_exp: progress.requiredExp,
      streak_days: progress.streakDays,
      total_completed_quests: progress.completedQuests,
      pending_rewards_count: progress.pendingRewards,
      last_active_date: new Date().toISOString().slice(0, 10),
    },
    { onConflict: "user_id" },
  );
  log("user_progress.upsert", error);
}

// ========================= Load Snapshot =========================
export interface SupabaseSnapshot {
  quests: Quest[];
  questHistory: QuestHistoryEntry[];
  events: CalendarEvent[];
  mainQuests: MainQuest[];
  memories: SerinMemory[];
  contacts: RelationshipContact[];
  diaryEntries: DiaryEntry[];
  progressBase: { level: number; currentExp: number; requiredExp: number; streakDays: number } | null;
}

// 한 테이블을 안전하게 읽습니다. 테이블이 아직 없거나(마이그레이션 전) 오류가 나면
// 빈 배열로 처리해 앱이 죽지 않게 합니다.
async function safeSelect(table: string, userId: string): Promise<Record<string, unknown>[]> {
  try {
    const sb = requireSupabase();
    const { data, error } = await sb.from(table).select("*").eq("user_id", userId);
    if (error) {
      log(`${table}.select`, error);
      return [];
    }
    return (data as Record<string, unknown>[]) ?? [];
  } catch (error) {
    log(`${table}.select`, error);
    return [];
  }
}

export async function loadSnapshot(userId: string): Promise<SupabaseSnapshot> {
  const [questRows, historyRows, eventRows, mainRows, memoryRows, contactRows, diaryRows, progressRows] =
    await Promise.all([
      safeSelect("quests", userId),
      safeSelect("quest_history", userId),
      safeSelect("calendar_events", userId),
      safeSelect("main_quests", userId),
      safeSelect("serin_memory", userId),
      safeSelect("contacts", userId),
      safeSelect("princess_diary", userId),
      safeSelect("user_progress", userId),
    ]);

  const progressRow = progressRows[0];

  return {
    // daily/side 만 남깁니다(과거 데이터에 다른 type이 섞여도 안전).
    quests: questRows.map(rowToQuest).filter((q) => q.type === "daily" || q.type === "side"),
    questHistory: historyRows.map((row) => ({
      id: row.id as string,
      questId: row.quest_id as string,
      completedAt: row.completed_at as string,
      rewardExp: (row.reward_exp as number) ?? 0,
      rewardItem: (row.reward_item as string) ?? undefined,
      note: (row.note as string) ?? "",
    })),
    events: eventRows.map(rowToEvent),
    mainQuests: mainRows.map(rowToMainQuest),
    memories: memoryRows.map(rowToMemory),
    contacts: contactRows.map(rowToContact),
    diaryEntries: diaryRows.map(rowToDiary),
    progressBase: progressRow
      ? {
          level: (progressRow.level as number) ?? 1,
          currentExp: (progressRow.current_exp as number) ?? 0,
          requiredExp: (progressRow.required_exp as number) ?? 100,
          streakDays: (progressRow.streak_days as number) ?? 0,
        }
      : null,
  };
}
