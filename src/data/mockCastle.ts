import type { PalaceRoom } from "../app/types";

export const mockCastleRooms: PalaceRoom[] = [
  {
    key: "garden",
    name: "왕궁 정원",
    subtitle: "Garden",
    description: "루틴, 컨디션, 데일리 퀘스트를 돌보는 회복 공간입니다.",
    image: "/assets/garden.png",
    route: "quests",
    stats: ["Daily 3", "Mood +2", "Routine"],
  },
  {
    key: "library",
    name: "왕국 도서관",
    subtitle: "Library",
    description: "메모, 검색, AI 요약과 지식 보관함이 모이는 공간입니다.",
    image: "/assets/library.png",
    route: "serin",
    stats: ["Memo 12", "Search", "Summary"],
  },
  {
    key: "office",
    name: "집무실",
    subtitle: "Office",
    description: "업무 퀘스트, 회의, 프로젝트를 정리하는 생산성의 중심입니다.",
    image: "/assets/office.png",
    route: "quests",
    stats: ["Meetings 2", "Tasks 4", "Focus"],
  },
  {
    key: "bedroom",
    name: "공주의 침실",
    subtitle: "Bedroom",
    description: "휴식, 회고, 감정 로그와 저녁 루틴을 정리하는 공간입니다.",
    image: "/assets/bedroom.png",
    route: "calendar",
    stats: ["Rest", "Diary", "Night"],
  },
  {
    key: "throne",
    name: "왕좌의 방",
    subtitle: "Throne",
    description: "레벨, 업적, 보상, 궁전 성장 상태를 확인하는 게임 시스템의 중심입니다.",
    image: "/assets/throne.png",
    route: "castle",
    stats: ["Lv.7", "Reward 3", "Castle"],
  },
];
