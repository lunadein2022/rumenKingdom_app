import type { SerinMessage, SerinProfile } from "../app/types";

export const mockSerin: SerinProfile = {
  name: "세린",
  role: "ai_maid",
  greetingTitle: "공주님, 좋은 아침입니다.",
  greetingText: "오늘의 퀘스트와 일정을 정리해두었습니다. 세린이 곁에서 동선을 보좌하겠습니다.",
  relationshipLabel: "신뢰",
  affinity: 64,
};

export const mockSerinMessages: SerinMessage[] = [
  {
    id: "m-001",
    sender: "serin",
    content: "공주님, 오늘은 집무실 퀘스트를 먼저 처리하면 흐름이 좋겠습니다.",
    createdAt: "2026-07-09T09:00:00+09:00",
  },
  {
    id: "m-002",
    sender: "princess",
    content: "오늘 중요한 일부터 정리해줘.",
    createdAt: "2026-07-09T09:01:00+09:00",
  },
  {
    id: "m-003",
    sender: "serin",
    content: "지원사업 보고서, 회의 일정 확인, 도서관 메모 순서로 추천드립니다.",
    createdAt: "2026-07-09T09:02:00+09:00",
  },
];
