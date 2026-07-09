export type DiaryStatus = "draft" | "saved" | "discarded";

export interface DiaryDraft {
  id: string;
  title: string;
  content: string;
  date: string;
  source: "serin" | "manual" | "system";
  status: DiaryStatus;
  createdAt: string;
}
