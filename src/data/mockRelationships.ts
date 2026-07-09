import type { RelationshipContact } from "../app/types";

// 인연록(Relationship) — 왕국도서관과 별도인 독립 도메인입니다. 아직 실제
// 연락처/CRM 연동이 없어서 mock 데이터입니다.
// TODO: Replace with Supabase Query from contacts / relationship_book.
export const mockContacts: RelationshipContact[] = [
  {
    id: "rel-001",
    name: "주청림 대표",
    affinity: 5,
    organization: "DummDumm Inc.",
    position: "대표이사",
    phone: "031-792-2780",
    email: "ceo@dummdumm.example",
    memo: "Hydro Hawk CES 준비를 함께 챙기는 대표님. 보고는 간결하게, 진행률 중심으로.",
    lastContactAt: "2026-07-08T17:20:00",
    lastMeetingAt: "2026-07-09T15:00:00",
    relatedMainQuestIds: ["mq-hydrohawk-ces", "mq-princess-os"],
    aiSummary: "최근 3개월간 대표님과의 대화는 대부분 Hydro Hawk CES 준비 진행률 보고와 K-water 협업 논의였습니다.",
  },
  {
    id: "rel-002",
    name: "김도윤 팀장",
    affinity: 4,
    organization: "K-water",
    position: "수질관리팀 팀장",
    phone: "010-0000-0000",
    email: "kim.dy@example.com",
    memo: "Hydro Hawk 실증 협업 담당자. 데이터 포맷을 꼼꼼히 확인하는 편.",
    lastContactAt: "2026-07-05T10:00:00",
    lastMeetingAt: "2026-06-20T11:00:00",
    relatedMainQuestIds: ["mq-hydrohawk-ces"],
    aiSummary: "실증 데이터 공유 방식과 미팅 일정 조율 위주의 대화가 이어지고 있습니다.",
  },
  {
    id: "rel-003",
    name: "이든 경",
    affinity: 5,
    organization: "DummDumm Inc.",
    position: "비서실",
    phone: "031-792-2781",
    memo: "가장 신뢰하는 동료. 일정 조율과 다이어리 회고를 함께 챙겨줌.",
    lastContactAt: "2026-07-09T09:00:00",
    relatedMainQuestIds: ["mq-princess-os"],
    aiSummary: "최근에는 Princess OS 개발 진행 상황을 주로 공유했습니다.",
  },
];
