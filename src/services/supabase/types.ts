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
  memory_type: string;
  content: string;
  importance: number;
}
