import type { DiaryDraft } from "../../diary/types/diary.types";

export function createDiary(drafts: DiaryDraft[], input: Omit<DiaryDraft, "id" | "createdAt">) {
  // TODO: Replace with Supabase Query
  return [{ ...input, id: `princess-diary-${Date.now()}`, createdAt: new Date().toISOString() }, ...drafts];
}

export function updateDiary(drafts: DiaryDraft[], id: string, content: string) {
  // TODO: Replace with Supabase Query
  return drafts.map((draft) => (draft.id === id ? { ...draft, content } : draft));
}

export function generateDiaryDraft() {
  // TODO: Replace mock response with actual AI API call
  return "오늘의 일정, 완료한 Quest, 세린과의 대화를 바탕으로 작성한 다이어리 초안입니다.";
}

export function getDiaryByDate(drafts: DiaryDraft[], date: string) {
  // TODO: Replace with Supabase Query
  return drafts.filter((draft) => draft.date === date);
}

export function searchDiary(drafts: DiaryDraft[], query: string) {
  // TODO: Replace with Supabase Query
  return drafts.filter((draft) => draft.content.includes(query) || draft.title.includes(query));
}
