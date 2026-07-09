import type { AppMockData } from "../app/types";
import { getMockCastleRooms } from "./mockCastle";
import { mockCalendarEvents } from "./mockHome";
import { mockAchievements, mockInventory } from "./mockInventory";
import { mockPrincess, mockTitles } from "./mockPrincess";
import { buildMockProgress } from "./mockProgress";
import { mockQuestHistory, mockQuests } from "./mockQuests";
import { mockSerin, mockSerinMessages } from "./mockSerin";

export function getPrincessOsSnapshot(): AppMockData {
  // TODO: replace this composition with Supabase service calls and a typed view model mapper.
  const progress = buildMockProgress(
    mockQuests,
    mockPrincess.currentExp,
    mockPrincess.requiredExp,
  );

  return {
    princess: mockPrincess,
    serin: mockSerin,
    progress,
    titles: mockTitles,
    quests: mockQuests,
    questHistory: mockQuestHistory,
    events: mockCalendarEvents,
    serinMessages: mockSerinMessages,
    rooms: getMockCastleRooms(progress.level),
    achievements: mockAchievements,
    inventory: mockInventory,
  };
}
