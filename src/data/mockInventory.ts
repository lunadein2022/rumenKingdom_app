import type { Achievement, InventoryItem } from "../app/types";

export const mockAchievements: Achievement[] = [
  {
    id: "a-001",
    title: "첫 브리핑 완료",
    description: "세린과 오늘의 계획을 확인했습니다.",
    expReward: 10,
    goldReward: 4,
    unlocked: true,
  },
  {
    id: "a-002",
    title: "정원의 수호자",
    description: "루틴 퀘스트를 7회 완료하세요.",
    expReward: 30,
    goldReward: 12,
    unlocked: false,
  },
];

export const mockInventory: InventoryItem[] = [
  { id: "i-001", name: "새벽의 티아라", slot: "왕관", equipped: true },
  { id: "i-002", name: "로열 블루 드레스", slot: "드레스", equipped: true },
  { id: "i-003", name: "루멘 브로치", slot: "액세서리", equipped: true },
];
