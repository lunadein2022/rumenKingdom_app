import type { CastleRoom } from "../features/castle/types/castle.types";

// Castle(왕성)은 공간 이동 허브입니다. 해금 시스템은 없으므로 모든 방이 항상
// 이동 가능합니다. 방 레벨/방문수/장식 같은 상태도 두지 않습니다.
// TODO: Replace with Supabase Query from castle_rooms.
export const mockCastleRooms: CastleRoom[] = [
  {
    key: "lobby",
    name: "로비",
    subtitle: "Lobby",
    role: "오늘 브리핑과 세린이 있는 시작 위치",
    description: "공주와 세린이 하루를 시작하는 루멘 왕성의 중심 공간입니다.",
    image: "/assets/palace-main.webp",
    route: "home",
    stats: ["Today", "Serin", "Briefing"],
  },
  {
    key: "office",
    name: "집무실",
    subtitle: "Office",
    role: "메인퀘스트(프로젝트) 관리",
    description: "Hydro Hawk CES, Princess OS 개발 같은 메인퀘스트(프로젝트)를 관리하는 공간입니다.",
    image: "/assets/office.webp",
    route: "office",
    stats: ["Projects", "Chapters", "Updates"],
  },
  {
    key: "library",
    name: "왕국 도서관",
    subtitle: "Library",
    role: "기록, 완료 Quest, Diary, 인연록 검색",
    description: "완료된 Quest, 지난 일정, 다이어리, 인연록, 세린 기억이 보관되는 기억의 공간입니다.",
    image: "/assets/library.webp",
    route: "library",
    stats: ["History", "Diary", "Search"],
  },
  {
    key: "bedroom",
    name: "공주의 침실",
    subtitle: "Bedroom",
    role: "Diary, 하루 회고",
    description: "오늘 일정, 완료 Quest, 프로젝트 업데이트를 모아 다이어리를 쓰는 공간입니다.",
    image: "/assets/bedroom.webp",
    route: "bedroom",
    stats: ["Diary", "Emotion", "Reflection"],
  },
  {
    key: "garden",
    name: "왕궁 정원",
    subtitle: "Garden",
    role: "휴식과 감정 회복",
    description: "바람과 꽃, 세린의 부드러운 멘트가 있는 비생산 공간입니다.",
    image: "/assets/garden.webp",
    route: "garden",
    stats: ["Rest", "Mood", "Healing"],
  },
  {
    key: "throne",
    name: "왕좌의 방",
    subtitle: "Throne",
    role: "성장, 칭호, 업적, 보상 확인",
    description: "공주의 레벨, EXP, 칭호, 업적, 누적 성과를 확인하는 성장의 중심입니다.",
    image: "/assets/throne.webp",
    route: "throne",
    stats: ["Level", "Titles", "Achievements"],
  },
];
