import { useEffect, useState } from "react";
import type { CalendarEvent, DiaryEntry, MainQuest, Quest, SerinProfile } from "../../../app/types";
import { Button } from "../../../components/design-system/Button";

interface BedroomPageProps {
  serin: SerinProfile;
  diaryEntries: DiaryEntry[];
  todayEvents: CalendarEvent[];
  todayCompletedQuests: Quest[];
  mainQuestUpdatesToday: Array<{ mainQuest: MainQuest; content: string }>;
  onSaveDiary: (content: string, moodEmoji: string, moodLabel: string) => void;
  onUpdateDiary?: (id: string, content: string, moodEmoji: string, moodLabel: string) => void;
  onDeleteDiary?: (id: string) => void;
  focusTarget?: "today" | "yesterday" | null;
  onFocusConsumed?: () => void;
  todayDate?: string;
}

const moods: Array<{ emoji: string; label: string }> = [
  { emoji: "☁", label: "보랏빛 하루" },
  { emoji: "☀", label: "기쁨" },
  { emoji: "☔", label: "차분함" },
  { emoji: "☾", label: "몽온" },
];

type BedroomTab = "today" | "past";

export function BedroomPage({
  serin,
  diaryEntries,
  todayEvents,
  todayCompletedQuests,
  mainQuestUpdatesToday,
  onSaveDiary,
  onUpdateDiary,
  onDeleteDiary,
  focusTarget,
  onFocusConsumed,
  todayDate,
}: BedroomPageProps) {
  const [content, setContent] = useState("");
  const [mood, setMood] = useState(moods[0]);
  const [tab, setTab] = useState<BedroomTab>("today");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const todayEntry = todayDate ? diaryEntries.find((entry) => entry.date === todayDate) : undefined;
  const pastEntries = diaryEntries.filter((entry) => entry.date !== todayDate);
  const selectedPast = pastEntries.find((entry) => entry.id === selectedEntryId) ?? pastEntries[0];

  useEffect(() => {
    if (!focusTarget) return;
    setTab(focusTarget === "today" ? "today" : "past");
    onFocusConsumed?.();
  }, [focusTarget, onFocusConsumed]);

  const draft = [
    todayEvents.length ? `오늘은 ${todayEvents.map((event) => event.title).join(", ")} 일정이 있었어요.` : "오늘은 조용히 흐름을 정리한 날이에요.",
    todayCompletedQuests.length ? `${todayCompletedQuests.length}개의 Quest를 완료했어요.` : "완료한 Quest는 아직 없지만, 쉬어가는 시간도 기록이에요.",
    mainQuestUpdatesToday.length ? `프로젝트 업데이트: ${mainQuestUpdatesToday.map((item) => item.content).join(" / ")}` : "프로젝트는 내일 다시 차분히 이어가면 됩니다.",
  ].join("\n");

  function save() {
    const text = content.trim() || draft;
    if (editingId && onUpdateDiary) {
      onUpdateDiary(editingId, text, mood.emoji, mood.label);
      setEditingId(null);
    } else {
      onSaveDiary(text, mood.emoji, mood.label);
    }
    setContent("");
  }

  function editEntry(entry: DiaryEntry) {
    setEditingId(entry.id);
    setContent(entry.content);
    setMood(moods.find((option) => option.label === entry.moodLabel) ?? moods[0]);
    setTab("today");
  }

  return (
    <section className="palace-scene bedroom-scene scene-fullbleed">
      <div className="palace-bg" style={{ backgroundImage: 'url("/assets/bedroom.webp")' }} />
      <div className="palace-vignette" />
      <header className="scene-title bedroom-title">
        <span>♕ 공주의 침실 <em>Princess Bedroom</em></span>
        <p>오늘의 하루를 기록하고, 세린과 함께 일기를 완성해 보세요.</p>
      </header>

      <aside className="palace-panel bedroom-left-panel">
        <h2>2026년 7월</h2>
        <div className="mini-calendar-grid">
          {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => <span key={day} className={day === 10 ? "active" : ""}>{day}</span>)}
        </div>
        <section>
          <h3>오늘의 요약</h3>
          <p>일정 <strong>{todayEvents.length}건</strong></p>
          <p>완료한 Quest <strong>{todayCompletedQuests.length}개</strong></p>
          <p>기록한 업데이트 <strong>{mainQuestUpdatesToday.length}개</strong></p>
        </section>
        <section>
          <h3>오늘의 기분</h3>
          <div className="mood-row">
            {moods.map((item) => <button key={item.label} type="button" className={item.label === mood.label ? "active" : ""} onClick={() => setMood(item)}>{item.emoji} {item.label}</button>)}
          </div>
        </section>
      </aside>

      <main className="bedroom-draft-card">
        <div className="diary-steps"><span>1 오늘 일정 확인</span><b>2 세린의 일기 초안</b><span>3 공주의 수정 & 저장</span></div>
        <header>
          <img src="/assets/serin-avatar-final.png" alt="세린" />
          <div><h1>세린의 일기 초안 ✨</h1><p>공주님의 하루를 정리해 보았어요.</p></div>
          <button type="button" onClick={() => setContent(draft)}>다시 생성</button>
        </header>
        <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder={draft} />
        <div className="activity-strip">
          {todayEvents.slice(0, 3).map((event) => <article key={event.id}><time>{event.startAt.slice(11, 16)}</time><strong>{event.title}</strong><span>{event.location}</span></article>)}
          {todayCompletedQuests.slice(0, 3).map((quest) => <article key={quest.id}><time>✓</time><strong>{quest.title}</strong><span>Quest 완료</span></article>)}
        </div>
        <div className="diary-actions"><Button variant="glass" onClick={() => setContent("")}>수정하기</Button><Button onClick={save}>저장하기</Button></div>
      </main>

      <aside className="palace-panel bedroom-right-panel">
        <div className="mini-list-head"><h2>이전 일기</h2><button type="button" onClick={() => setTab("past")}>전체 보기</button></div>
        {pastEntries.slice(0, 5).map((entry) => (
          <button key={entry.id} type="button" className={entry.id === selectedPast?.id ? "active" : ""} onClick={() => setSelectedEntryId(entry.id)}>
            <span>{entry.date}</span><strong>{entry.content.slice(0, 24)}</strong><em>{entry.moodEmoji} {entry.moodLabel}</em>
          </button>
        ))}
        {selectedPast && tab === "past" && <section className="past-preview"><h3>{selectedPast.date}</h3><p>{selectedPast.content}</p><button type="button" onClick={() => editEntry(selectedPast)}>수정</button>{onDeleteDiary && <button type="button" onClick={() => onDeleteDiary(selectedPast.id)}>삭제</button>}</section>}
        <section className="serin-bedroom-help"><strong>{serin.name}이 도와드릴까요?</strong><button type="button" onClick={() => setContent(draft)}>일기 초안 다시 작성</button><button type="button" onClick={() => setTab("past")}>지난 일기 보기</button></section>
      </aside>
    </section>
  );
}
