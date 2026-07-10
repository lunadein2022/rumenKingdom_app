import type { MainQuest, MainQuestUpdate, Quest } from "../app/types";
import { newId } from "../app/ids";

// 메인퀘스트 = 프로젝트. Office가 관리하는 장기 프로젝트 단위입니다.
// 여기서는 메인퀘스트 자체의 진행률/업데이트/누적 EXP 계산만 다루고,
// 그 아래 실행 퀘스트(서브/일일/반복)는 domain/questDomain.ts가 다룹니다.

export function computeMainQuestProgress(mainQuest: MainQuest): number {
  if (mainQuest.chapters.length === 0) return mainQuest.progress;
  const done = mainQuest.chapters.filter((chapter) => chapter.done).length;
  return Math.round((done / mainQuest.chapters.length) * 100);
}

export function getLinkedQuests(mainQuest: MainQuest, quests: Quest[]): Quest[] {
  return quests.filter((quest) => quest.mainQuestId === mainQuest.id);
}

export function getMainQuestExpTotal(mainQuest: MainQuest, quests: Quest[]): number {
  const linked = getLinkedQuests(mainQuest, quests).filter((quest) => quest.status === "completed");
  return linked.reduce((sum, quest) => sum + quest.expReward, mainQuest.expTotal);
}

export function addMainQuestUpdate(mainQuest: MainQuest, content: string, author: MainQuestUpdate["author"] = "princess"): MainQuest {
  const update: MainQuestUpdate = {
    id: `mqu-${mainQuest.id}-${Date.now()}`,
    date: new Date().toISOString(),
    content,
    author,
  };
  return {
    ...mainQuest,
    updates: [update, ...mainQuest.updates],
    updatedAt: new Date().toISOString(),
  };
}

export function toggleMainQuestChapter(mainQuest: MainQuest, chapterId: string): MainQuest {
  const chapters = mainQuest.chapters.map((chapter) =>
    chapter.id === chapterId ? { ...chapter, done: !chapter.done } : chapter,
  );
  const allDone = chapters.length > 0 && chapters.every((chapter) => chapter.done);
  return {
    ...mainQuest,
    chapters,
    progress: computeMainQuestProgress({ ...mainQuest, chapters }),
    status: allDone ? "completed" : mainQuest.status,
    updatedAt: new Date().toISOString(),
  };
}

export function createMainQuestFromSerinDraft(title: string): MainQuest {
  const now = new Date().toISOString();
  // TODO:
  // Replace with Supabase Query — main_quests insert.
  return {
    id: newId(),
    title,
    description: "세린과의 대화에서 시작된 새 메인퀘스트(프로젝트)입니다.",
    status: "active",
    progress: 0,
    priority: "medium",
    startDate: now.slice(0, 10),
    dueDate: now.slice(0, 10),
    chapters: [],
    subQuestIds: [],
    dailyQuestIds: [],
    routineQuestIds: [],
    linkedCalendarEventIds: [],
    updates: [
      {
        id: `mqu-init-${Date.now()}`,
        date: now,
        content: "세린이 대화에서 이 프로젝트를 새로 등록했습니다.",
        author: "serin",
      },
    ],
    relatedContactIds: [],
    attachedFiles: [],
    rewardExp: 300,
    rewardGold: 60,
    expTotal: 0,
    createdAt: now,
    updatedAt: now,
  };
}
