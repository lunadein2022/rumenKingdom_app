import { useState } from "react";
import type { CalendarEvent, DiaryEntry, MainQuest, Quest, SerinProfile } from "../../../app/types";
import { Button } from "../../../components/design-system/Button";

interface BedroomPageProps {
  serin: SerinProfile;
  diaryEntries: DiaryEntry[];
  todayEvents: CalendarEvent[];
  todayCompletedQuests: Quest[];
  mainQuestUpdatesToday: Array<{ mainQuest: MainQuest; content: string }>;
  onSaveDiary: (content: string, moodEmoji: string, moodLabel: string) => void;
}

const moods: Array<{ emoji: string; label: string }> = [
  { emoji: "🙂", label: "평온" },
  { emoji: "😊", label: "기쁨" },
  { emoji: "😮‍💨", label: "피곤" },
  { emoji: "😔", label: "속상" },
];

// Bedroom = 다이어리 공간입니다. 오늘 일정/완료 퀘스트/프로젝트 업데이트를
// 자동으로 모아 보여주고, 느낀 점을 기록하면 AI가 요약(mock)해줍니다.
export function BedroomPage({ serin, diaryEntries, todayEvents, todayCompletedQuests, mainQuestUpdatesToday, onSaveDiary }: BedroomPageProps) {
  const [content, setContent] = useState("");
  const [mood, setMood] = useState(moods[0]);
  const latestEntry = diaryEntries[0];

  function handleSave() {
    if (!content.trim()) return;
    onSaveDiary(content.trim(), mood.emoji, mood.label);
    setContent("");
  }

  return (
    <section className="bedroom-scene-full">
      <div className="bedroom-scene-backdrop" style={{ backgroundImage: 'url("/assets/bedroom.webp")' }} />
      <img className="bedroom-princess-full" src="/assets/princess-full-transparent.webp" alt="침실의 공주" />

      <div className="bedroom-copy-overlay">
        <span>공주의 침실</span>
        <h1>오늘도 수고하셨어요.</h1>
      </div>

      <div className="bedroom-speech-bubble">
        <strong>{serin.name}</strong>
        <p>오늘을 기록해볼까요? 오늘 있었던 일들을 먼저 모아봤어요.</p>
      </div>

      <div className="bedroom-diary-panel">
        <section className="bedroom-auto-summary">
          <h2>오늘 자동 요약</h2>
          <div>
            <h3>오늘 일정</h3>
            {todayEvents.length === 0 ? <p className="small-copy">오늘 일정이 없습니다.</p> : todayEvents.map((event) => <p key={event.id}>• {event.title}</p>)}
          </div>
          <div>
            <h3>오늘 완료</h3>
            {todayCompletedQuests.length === 0 ? <p className="small-copy">오늘 완료한 항목이 없습니다.</p> : todayCompletedQuests.map((quest) => <p key={quest.id}>• {quest.title}</p>)}
          </div>
          <div>
            <h3>오늘 프로젝트 업데이트</h3>
            {mainQuestUpdatesToday.length === 0 ? (
              <p className="small-copy">오늘 등록된 프로젝트 업데이트가 없습니다.</p>
            ) : (
              mainQuestUpdatesToday.map((item, index) => (
                <p key={index}>• {item.mainQuest.title} — {item.content}</p>
              ))
            )}
          </div>
        </section>

        <section className="bedroom-write-panel">
          <h2>느낀 점</h2>
          <div className="bedroom-mood-row">
            {moods.map((option) => (
              <button
                key={option.label}
                type="button"
                className={option.label === mood.label ? "active" : ""}
                onClick={() => setMood(option)}
              >
                {option.emoji} {option.label}
              </button>
            ))}
          </div>
          <textarea
            placeholder="오늘 하루는 어땠나요?"
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
          <Button onClick={handleSave}>일기 저장하기</Button>
        </section>

        {latestEntry?.aiSummary && (
          <section className="bedroom-ai-summary">
            <h2>AI 오늘 요약</h2>
            <p>{latestEntry.aiSummary}</p>
          </section>
        )}
      </div>
    </section>
  );
}
