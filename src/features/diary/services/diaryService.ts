import type { DiaryDraft } from "../types/diary.types";

export function getDiaryByRange(drafts: DiaryDraft[], startDate: string, endDate: string) {
  // TODO: Replace with Supabase Query
  return drafts
    .filter((draft) => draft.date >= startDate && draft.date <= endDate)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getDiaryByDay(drafts: DiaryDraft[], date: string) {
  // TODO: Replace with Supabase Query
  return drafts.filter((draft) => draft.date === date);
}

export function createDiaryDraft(drafts: DiaryDraft[], input: Omit<DiaryDraft, "id" | "createdAt">) {
  // TODO: Replace with Supabase Query
  return [
    {
      ...input,
      id: `diary-${Date.now()}`,
      createdAt: new Date().toISOString(),
    },
    ...drafts,
  ];
}
