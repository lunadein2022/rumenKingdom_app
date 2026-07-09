import type { CastleRoom } from "../features/castle/types/castle.types";

export const baseCastleRooms: CastleRoom[] = [
  {
    key: "lobby",
    name: "로비",
    subtitle: "Lobby",
    role: "오늘 브리핑과 세린이 있는 시작 위치",
    description: "공주와 세린이 하루를 시작하는 루멘 왕성의 중심 공간입니다.",
    image: "/assets/palace-main.png",
    route: "home",
    roomLevel: 3,
    isDiscovered: true,
    visitedCount: 24,
    stats: ["오늘", "세린", "브리핑"],
    decorations: ["crystal_chandelier", "blue_carpet"],
  },
  {
    key: "throne",
    name: "왕좌의 방",
    subtitle: "Throne",
    role: "성장, 칭호, 업적, 보상 확인",
    description: "공주의 레벨, EXP, 칭호, 업적, 보상을 확인하는 성장 시스템의 중심입니다.",
    image: "/assets/throne.png",
    route: "progress",
    roomLevel: 1,
    isDiscovered: true,
    visitedCount: 2,
    stats: ["성장", "보상", "칭호"],
    decorations: ["royal_banner"],
  },
  {
    key: "library",
    name: "왕국 도서관",
    subtitle: "Library",
    role: "기록, 완료 Quest, Diary, 인연록 보관",
    description: "완료된 Quest, 지난 일정, 다이어리, 인연록, AI 요약을 보관하는 기억의 공간입니다.",
    image: "/assets/library.png",
    route: "library",
    roomLevel: 2,
    isDiscovered: true,
    visitedCount: 12,
    stats: ["기록", "검색", "요약"],
    decorations: ["book_wall", "reading_lamp"],
  },
  {
    key: "office",
    name: "집무실",
    subtitle: "Office",
    role: "Calendar, 프로젝트, 메인 Quest",
    description: "회의, 프로젝트, 메인 Quest를 다루는 생산성 중심 공간입니다.",
    image: "/assets/office.png",
    route: "quests",
    roomLevel: 2,
    isDiscovered: true,
    visitedCount: 17,
    stats: ["회의", "프로젝트", "집중"],
    decorations: ["writing_desk", "royal_clock"],
  },
  {
    key: "garden",
    name: "왕궁 정원",
    subtitle: "Garden",
    role: "휴식과 감정 회복",
    description: "바람과 꽃, 세린의 부드러운 멘트가 있는 비생산성 휴식 공간입니다.",
    image: "/assets/garden.png",
    route: "garden",
    roomLevel: 4,
    isDiscovered: true,
    visitedCount: 21,
    stats: ["휴식", "감정", "회복"],
    decorations: ["fountain", "flower_bed", "bench"],
  },
  {
    key: "bedroom",
    name: "공주의 침실",
    subtitle: "Bedroom",
    role: "Diary, 회고, 내일 목표",
    description: "오늘의 일정, 완료 Quest, 세린과의 대화를 모아 하루를 정리하는 공간입니다.",
    image: "/assets/bedroom.png",
    route: "calendar",
    roomLevel: 1,
    isDiscovered: true,
    visitedCount: 0,
    stats: ["다이어리", "회고", "수면"],
    decorations: ["moon_curtain"],
  },
];

export function normalizeRoomState(room: CastleRoom): CastleRoom {
  return {
    ...room,
    isDiscovered: true,
  };
}

export function getMockCastleRooms() {
  return baseCastleRooms.map((room) => normalizeRoomState(room));
}

export const mockCastleRooms = getMockCastleRooms();
