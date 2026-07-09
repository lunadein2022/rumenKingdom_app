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
  // 세린이 "어제 일기 수정할게" 같은 diary.update 확인 후 어느 탭/날짜를 열어야
  // 하는지 알려주는 신호입니다. 소비하고 나면 onFocusConsumed로 초기화합니다.
  focusTarget?: "today" | "yesterday" | null;
  onFocusConsumed?: () => void;
  todayDate?: string;
}

const moods: Array<{ emoji: string; label: string }> = [
  { emoji: "🙂", label: "평온" },
  { emoji: "😊", label: "기쁨" },
  { emoji: "😮‍💨", label: "피곤" },
  { emoji: "😔", label: "속상" },
];

type BedroomTab = "today" | "past";

// Bedroom = 다이어리 공간입니다. 오늘 일정/완료 퀘스트/프로젝트 업데이트를
// 자동으로 모아 보여주고, 느낀 점을 기록하면 AI가 요약(mock)해줍니다.
// "오늘 기록 보기" / "지난 일기 보기" 두 탭으로 나뉘어, 작성(오늘)과 열람(지난
// 일기)의 역할을 분리합니다. 실제 저장/보관은 왕국도서관과 공유하되, 침실은
// "쓰는 곳", 도서관은 "찾는 곳"으로 역할을 나눕니다.
//
// 오늘 기록/지난 일기 모두 수정·삭제가 가능하고, 지난 일기는 날짜/기분/내용
// 키워드로 검색할 수 있습니다 (실제 영속화 전까지는 세션 상태 기준 CRUD).
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
  const [editingTodayEntry, setEditingTodayEntry] = useState(false);
  const [pastEditId, setPastEditId] = useState<string | null>(null);
  const [pastEditContent, setPastEditContent] = useState("");
  const [pastEditMood, setPastEditMood] = useState(moods[0]);
  const [searchQuery, setSearchQuery] = useState("");

  const latestEntry = diaryEntries[0];
  const todayEntry = todayDate ? diaryEntries.find((entry) => entry.date === todayDate) : undefined;
  const allPastEntries = diaryEntries.filter((entry) => entry.date !== todayDate);
  const keyword = searchQuery.trim().toLowerCase();
  const pastEntries = keyword
    ? allPastEntries.filter(
        (entry) =>
          entry.date.toLowerCase().includes(keyword) ||
          entry.moodLabel.toLowerCase().includes(keyword) ||
          entry.content.toLowerCase().includes(keyword),
      )
    : allPastEntries;
  const selectedEntry = pastEntries.find((entry) => entry.id === selectedEntryId) ?? pastEntries[0];

  // 세린이 "어제 일기 수정할게"라고 확인하면 이 컴포넌트가 자동으로 지난 일기
  // 탭으로 전환되고, 가능하면 해당 날짜 항목을 펼쳐 보여줍니다.
  useEffect(() => {
    if (!focusTarget) return;
    if (focusTarget === "today") {
      setTab("today");
    } else {
      setTab("past");
      const yesterdayEntry = allPastEntries[0];
      if (yesterdayEntry) setSelectedEntryId(yesterdayEntry.id);
    }
    onFocusConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTarget]);

  function handleSave() {
    if (!content.trim()) return;
    onSaveDiary(content.trim(), mood.emoji, mood.label);
    setContent("");
    setEditingTodayEntry(false);
  }

  function startEditToday() {
    if (!todayEntry) return;
    setContent(todayEntry.content);
    const matchedMood = moods.find((option) => option.label === todayEntry.moodLabel) ?? moods[0];
    setMood(matchedMood);
    setEditingTodayEntry(true);
  }

  function startEditPast(entry: DiaryEntry) {
    setPastEditId(entry.id);
    setPastEditContent(entry.content);
    setPastEditMood(moods.find((option) => option.label === entry.moodLabel) ?? moods[0]);
  }

  function savePastEdit() {
    if (!pastEditId || !pastEditContent.trim() || !onUpdateDiary) return;
    onUpdateDiary(pastEditId, pastEditContent.trim(), pastEditMood.emoji, pastEditMood.label);
    setPastEditId(null);
  }

  function handleDeletePast(id: string) {
    if (!onDeleteDiary) return;
    onDeleteDiary(id);
    if (selectedEntryId === id) setSelectedEntryId(null);
    if (pastEditId === id) setPastEditId(null);
  }

  return (
    <section className="bedroom-scene-full scene-fullbleed">
      <div className="bedroom-scene-backdrop" style={{ backgroundImage: 'url("/assets/bedroom.webp")' }} />
      <img className="bedroom-princess-full" src="/assets/princess-full-transparent.webp" alt="침실의 공주" />

      <div className="bedroom-copy-overlay">
        <span>공주의 침실</span>
        <h1>오늘도 수고하셨어요.</h1>
      </div>

      <div className="bedroom-speech-bubble">
        <strong>{serin.name}</strong>
        <p>
          {tab === "today"
            ? "오늘을 기록해볼까요? 오늘 있었던 일들을 먼저 모아봤어요."
            : "지난 일기들을 모아뒀어요. 다시 읽고 싶은 날을 골라보세요."}
        </p>
      </div>

      <div className="bedroom-diary-panel">
        <div className="bedroom-diary-tabs">
          <button type="button" className={tab === "today" ? "active" : ""} onClick={() => setTab("today")}>
            오늘 기록 보기
          </button>
          <button type="button" className={tab === "past" ? "active" : ""} onClick={() => setTab("past")}>
            지난 일기 보기 ({allPastEntries.length})
          </button>
        </div>

        {tab === "today" && (
          <>
            {todayEntry && !editingTodayEntry && (
              <section className="bedroom-ai-summary">
                <div className="bedroom-entry-head">
                  <h2>오늘 이미 작성한 일기</h2>
                  <div className="bedroom-entry-actions">
                    <button type="button" onClick={startEditToday}>수정</button>
                    {onDeleteDiary && (
                      <button type="button" onClick={() => onDeleteDiary(todayEntry.id)}>삭제</button>
                    )}
                  </div>
                </div>
                <p>{todayEntry.moodEmoji} {todayEntry.content}</p>
                {todayEntry.aiSummary && <p className="small-copy">AI 요약: {todayEntry.aiSummary}</p>}
              </section>
            )}

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

            {(!todayEntry || editingTodayEntry) && (
              <section className="bedroom-write-panel">
                <h2>{todayEntry ? "오늘 기록 수정하기" : "느낀 점"}</h2>
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
                <div className="bedroom-write-actions">
                  <Button onClick={handleSave}>{todayEntry ? "수정 저장하기" : "일기 저장하기"}</Button>
                  {editingTodayEntry && (
                    <button type="button" className="bedroom-cancel-edit" onClick={() => { setEditingTodayEntry(false); setContent(""); }}>
                      취소
                    </button>
                  )}
                </div>
              </section>
            )}

            {latestEntry?.aiSummary && !todayEntry && (
              <section className="bedroom-ai-summary">
                <h2>AI 오늘 요약</h2>
                <p>{latestEntry.aiSummary}</p>
              </section>
            )}
          </>
        )}

        {tab === "past" && (
          <div className="bedroom-past-entry-list">
            <input
              type="search"
              className="bedroom-diary-search"
              placeholder="날짜, 기분, 내용으로 검색"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label="지난 일기 검색"
            />
            {allPastEntries.length === 0 ? (
              <p className="small-copy">아직 지난 일기가 없습니다. 오늘부터 하나씩 쌓아보세요.</p>
            ) : pastEntries.length === 0 ? (
              <p className="small-copy">검색 결과가 없습니다.</p>
            ) : (
              <>
                {pastEntries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={entry.id === selectedEntry?.id ? "active" : ""}
                    onClick={() => setSelectedEntryId(entry.id)}
                  >
                    <strong>{entry.date}</strong>
                    <span>{entry.moodEmoji} {entry.moodLabel}</span>
                  </button>
                ))}
                {selectedEntry && pastEditId !== selectedEntry.id && (
                  <section className="bedroom-ai-summary">
                    <div className="bedroom-entry-head">
                      <h2>{selectedEntry.date}의 기록</h2>
                      <div className="bedroom-entry-actions">
                        {onUpdateDiary && <button type="button" onClick={() => startEditPast(selectedEntry)}>수정</button>}
                        {onDeleteDiary && <button type="button" onClick={() => handleDeletePast(selectedEntry.id)}>삭제</button>}
                      </div>
                    </div>
                    <p>{selectedEntry.content}</p>
                    {selectedEntry.aiSummary && <p className="small-copy">AI 요약: {selectedEntry.aiSummary}</p>}
                  </section>
                )}
                {selectedEntry && pastEditId === selectedEntry.id && (
                  <section className="bedroom-write-panel">
                    <h2>{selectedEntry.date} 기록 수정하기</h2>
                    <div className="bedroom-mood-row">
                      {moods.map((option) => (
                        <button
                          key={option.label}
                          type="button"
                          className={option.label === pastEditMood.label ? "active" : ""}
                          onClick={() => setPastEditMood(option)}
                        >
                          {option.emoji} {option.label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={pastEditContent}
                      onChange={(event) => setPastEditContent(event.target.value)}
                    />
                    <div className="bedroom-write-actions">
                      <Button onClick={savePastEdit}>수정 저장하기</Button>
                      <button type="button" className="bedroom-cancel-edit" onClick={() => setPastEditId(null)}>
                        취소
                      </button>
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
