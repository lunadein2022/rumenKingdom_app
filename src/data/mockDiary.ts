import type { DiaryEntry } from "../app/types";

// Bedroom(다이어리) — 오늘 일정/완료 퀘스트/프로젝트 업데이트를 자동으로 모아
// 보여주고, 느낀 점을 기록합니다. 아직 실제 저장은 mock입니다.
// TODO: Replace with Supabase Query from princess_diary.
export const mockDiaryEntries: DiaryEntry[] = [
  {
    id: "diary-001",
    date: "2026-07-08",
    moodEmoji: "🙂",
    moodLabel: "평온",
    content: "오늘은 계획한 일정을 무리 없이 마쳤다. 세린이 중간중간 챙겨준 덕분에 여유가 있었다.",
    aiSummary: "안정적으로 하루를 마무리했고, Hydro Hawk 방수 테스트가 통과되어 좋은 흐름이 이어지고 있습니다.",
    linkedEventTitles: ["대표님 미팅"],
    linkedQuestTitles: ["회의 일정 확인"],
    linkedMainQuestUpdates: ["시제품 방수 테스트 통과. 다음은 부스 디자인 시안 확정입니다."],
  },
  {
    id: "diary-002",
    date: "2026-07-05",
    moodEmoji: "😮‍💨",
    moodLabel: "피곤",
    content: "회의가 연달아 있어서 정신없었지만, 저녁에는 정원에서 잠깐 쉴 수 있었다.",
    aiSummary: "일정이 많았던 하루였지만 저녁 휴식으로 균형을 잡았습니다.",
    linkedEventTitles: ["K-water 미팅"],
    linkedQuestTitles: [],
    linkedMainQuestUpdates: [],
  },
];
