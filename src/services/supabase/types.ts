export interface SupabaseRowBase {
  id: string;
  created_at: string;
  updated_at?: string;
}

export interface QuestRow extends SupabaseRowBase {
  user_id: string;
  type: "main" | "side" | "daily" | "routine" | "story";
  title: string;
  description: string;
  status: "pending" | "inProgress" | "completed";
  category: string;
  priority: "low" | "medium" | "high";
  chapter: string | null;
  parent_id: string | null;
  progress: number;
  exp_reward: number;
  gold_reward: number;
  reward_item: string | null;
  due_date: string | null;
  completed_at: string | null;
  reward_claimed: boolean;
}

export interface QuestHistoryRow extends SupabaseRowBase {
  user_id: string;
  quest_id: string;
  completed_at: string;
  reward_exp: number;
  reward_item: string | null;
  note: string;
}

export interface CalendarEventRow extends SupabaseRowBase {
  user_id: string;
  title: string;
  description: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
  category: "work" | "personal" | "quest" | "routine" | "meeting" | "serin" | "rest" | "event";
  priority: "low" | "medium" | "high";
  is_all_day: boolean;
  reminder_minutes: number | null;
  reminder_sent_at: string | null;
  linked_quest_id: string | null;
  status: "scheduled" | "completed" | "cancelled";
  created_by: "user" | "serin" | "system";
}

export interface CalendarReminderRow extends SupabaseRowBase {
  user_id: string;
  event_id: string;
  remind_at: string;
  status: "pending" | "sent" | "cancelled";
  sent_at: string | null;
}

export interface UserProgressRow extends SupabaseRowBase {
  user_id: string;
  level: number;
  current_exp: number;
  required_exp: number;
  total_completed_quests: number;
  streak_days: number;
  last_active_date: string | null;
  pending_rewards_count: number;
}

export interface PrincessProfileRow extends SupabaseRowBase {
  user_id: string;
  display_name: string;
  active_title: string;
  avatar_url: string | null;
  current_room: string;
  charm: number;
  wisdom: number;
  courage: number;
  diligence: number;
  serin_affinity: number;
}

export interface CastleRoomRow extends SupabaseRowBase {
  user_id: string;
  room_key: string;
  room_name: string;
  level: number;
  is_unlocked: boolean;
}

export interface SerinMemoryRow extends SupabaseRowBase {
  user_id: string;
  memory_type: "preference" | "person" | "routine" | "goal" | "constraint" | "emotion" | "work" | "personal" | "system";
  content: string;
  importance: "low" | "medium" | "high" | "critical";
  source: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
}

export interface SerinConversationRow extends SupabaseRowBase {
  user_id: string;
  title: string;
}

export interface SerinMessageRow extends SupabaseRowBase {
  conversation_id: string;
  user_id: string;
  role: "user" | "serin" | "system";
  message_type: "text" | "confirmation" | "quest_preview" | "calendar_preview" | "contact_preview" | "diary_preview" | "memory_saved" | "system_notice" | "error";
  content: string;
  metadata: Record<string, unknown>;
}

export interface ContactRow extends SupabaseRowBase {
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  organization: string | null;
  position: string | null;
  memo: string | null;
  source: "manual" | "serin" | "ocr" | "import";
  image_url: string | null;
  last_contacted_at: string | null;
}

export interface DiaryDraftRow extends SupabaseRowBase {
  user_id: string;
  title: string;
  content: string;
  source: "serin" | "system";
  status: "draft" | "saved" | "discarded";
}
