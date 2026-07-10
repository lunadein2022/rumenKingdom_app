import type { Quest, QuestHistoryEntry } from "../app/types";
import { questTypeMeta } from "../domain/questDomain";

// 메인퀘스트(=프로젝트)는 mockMainQuests.ts가 다룹니다. 여기는 실행형 퀘스트
// (서브/일일/반복/스토리)만 다룹니다. 초기 Mock 데이터는 예시 Quest 1개로
// 최소화해, 나중에 실제로 등록한 Quest와 처음부터 섞여 보이지 않게 합니다.
// TODO: Replace with Supabase Query from quests.
export const mockQuests: Quest[] = [
  {
    id: "q-daily-water",
    type: "daily",
    title: "물 마시기",
    description: "오늘의 컨디션을 지키는 일일 Quest입니다.",
    status: "pending",
    category: "care",
    priority: "medium",
    progress: 0,
    expReward: questTypeMeta.daily.baseExp,
    goldReward: 4,
    dueDate: "2026-07-09",
    rewardClaimed: false,
    source: "system",
  },
];

// TODO: Replace with Supabase Query from quest_history.
export const mockQuestHistory: QuestHistoryEntry[] = [];
