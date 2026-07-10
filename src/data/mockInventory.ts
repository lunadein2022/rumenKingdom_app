import type { Achievement, InventoryItem } from "../app/types";

// 업적 카탈로그(달성 조건 목록)입니다. 달성 여부(unlocked)는 실제 행동으로만
// 바뀌므로 초기값은 모두 false입니다.
export const mockAchievements: Achievement[] = [
  {
    id: "a-001",
    title: "첫 브리핑 완료",
    description: "세린과 오늘의 계획을 확인하세요.",
    expReward: 10,
    goldReward: 0,
    unlocked: false,
  },
  {
    id: "a-002",
    title: "정원의 수호자",
    description: "루틴 퀘스트를 7회 완료하세요.",
    expReward: 30,
    goldReward: 0,
    unlocked: false,
  },
];

// 인벤토리는 재화/장비 시스템이 실제로 생기기 전까지 비워둡니다.
export const mockInventory: InventoryItem[] = [];
