import type { PrincessProfile, UserTitle } from "../app/types";

// 공주 프로필의 시작 상태입니다. 고정된 가짜 성장치(레벨 7, EXP 2160 등)를
// 두지 않고, 모든 성장은 실제 퀘스트 완료에서만 발생합니다.
export const mockPrincess: PrincessProfile = {
  displayName: "Princess",
  activeTitle: "루멘의 공주",
  level: 1,
  currentExp: 0,
  requiredExp: 100,
  currentRoom: "lobby",
  stats: {
    charm: 0,
    wisdom: 0,
    courage: 0,
    diligence: 0,
  },
  equippedItems: [],
  serinAffinity: 0,
};

// 시작 칭호 하나만 지닙니다. 나머지는 실제 조건 달성 시스템이 생기면 추가합니다.
export const mockTitles: UserTitle[] = [
  { key: "lumen-princess", name: "루멘의 공주", unlocked: true, equipped: true },
];
