import type { PrincessProfile, UserTitle } from "../app/types";

export const mockPrincess: PrincessProfile = {
  displayName: "Princess",
  activeTitle: "루멘의 공주",
  level: 7,
  currentExp: 2160,
  requiredExp: 3000,
  currentRoom: "lobby",
  stats: {
    charm: 82,
    wisdom: 76,
    courage: 68,
    diligence: 91,
  },
  equippedItems: [
    { slot: "왕관", name: "새벽의 티아라" },
    { slot: "드레스", name: "로열 블루 드레스" },
    { slot: "액세서리", name: "루멘 브로치" },
    { slot: "장식", name: "정원의 리본" },
  ],
  serinAffinity: 64,
};

export const mockTitles: UserTitle[] = [
  { key: "lumen-princess", name: "루멘의 공주", unlocked: true, equipped: true },
  { key: "library-owner", name: "도서관의 주인", unlocked: true, equipped: false },
  { key: "garden-keeper", name: "정원의 수호자", unlocked: true, equipped: false },
  { key: "office-commander", name: "집무실의 지휘관", unlocked: false, equipped: false },
];
