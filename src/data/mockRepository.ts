import type { AppMockData } from "../app/types";
import { mockCastleRooms } from "./mockCastle";
import { mockCalendarEvents } from "./mockHome";
import { mockAchievements, mockInventory } from "./mockInventory";
import { mockPrincess, mockTitles } from "./mockPrincess";
import { buildMockProgress } from "./mockProgress";
import { mockQuests } from "./mockQuests";
import { mockSerin } from "./mockSerin";

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
    events: mockCalendarEvents,
    rooms: mockCastleRooms,
    achievements: mockAchievements,
    inventory: mockInventory,
  };
}
