export const supabaseTables = {
  profiles: "profiles",
  princessProfiles: "princess_profiles",
  quests: "quests",
  calendarEvents: "calendar_events",
  userProgress: "user_progress",
  dailyCompletions: "daily_completions",
  castleRooms: "castle_rooms",
  achievements: "achievements",
  userAchievements: "user_achievements",
  inventoryItems: "inventory_items",
  userTitles: "user_titles",
  serinConversations: "serin_conversations",
  serinMemory: "serin_memory",
} as const;

export type SupabaseTableName = (typeof supabaseTables)[keyof typeof supabaseTables];
