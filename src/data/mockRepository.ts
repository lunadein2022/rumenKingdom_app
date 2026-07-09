import type { AppMockData } from "../app/types";
import { USE_MOCK_DATA } from "./dataMode";
import { mockCastleRooms } from "./mockCastle";
import { mockCalendarEvents } from "./mockHome";
import { mockAchievements, mockInventory } from "./mockInventory";
import { mockPrincess, mockTitles } from "./mockPrincess";
import { buildMockProgress } from "./mockProgress";
import { mockQuestHistory, mockQuests } from "./mockQuests";
import { mockSerin, mockSerinMessages } from "./mockSerin";

export function getPrincessOsSnapshot(): AppMockData {
  if (!USE_MOCK_DATA) {
    // Supabase 서비스 레이어(services/supabase/*.ts)는 아직 어떤 화면에서도 호출되지 않는
    // TODO 스캐폴딩입니다. VITE_USE_MOCK=false 로 끄더라도 조용히 mock으로 돌아가지 않고,
    // 여기서 명확히 실패시켜 "Supabase 연동 완료"라는 착각을 막습니다.
    throw new Error(
      "VITE_USE_MOCK=false 이지만 Supabase 연동은 아직 구현되지 않았습니다. " +
        "services/supabase/*.ts 를 완성한 뒤 이 분기를 실제 조회 로직으로 교체하세요.",
    );
  }

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
    rooms: mockCastleRooms,
    achievements: mockAchievements,
    inventory: mockInventory,
  };
}
