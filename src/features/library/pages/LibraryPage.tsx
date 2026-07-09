import { useMemo, useState } from "react";
import type { CalendarEvent, Quest, QuestHistoryEntry, SerinMessage } from "../../../app/types";
import type { SerinMemory } from "../../serin/types/serin.types";
import { Badge } from "../../../components/design-system/Badge";

interface LibraryPageProps {
  quests: Quest[];
  history: QuestHistoryEntry[];
  events: CalendarEvent[];
  messages: SerinMessage[];
  memories: SerinMemory[];
}

type LibraryScope = "past" | "current" | "future" | "all";
type LibraryTab = "quests" | "events" | "diary" | "relationships" | "memory";
const today = "2026-07-09";

const tabs: Array<{ key: LibraryTab; label: string }> = [
  { key: "quests", label: "완료 Quest" },
  { key: "events", label: "지난 일정" },
  { key: "diary", label: "Diary" },
  { key: "relationships", label: "인연록" },
  { key: "memory", label: "Serin Memory" },
];

function inScope(date: string, scope: LibraryScope) {
  if (scope === "all") return true;
  if (scope === "past") return date < today;
  if (scope === "future") return date > today;
  return date === today;
}

function includesQuery(text: string, query: string) {
  return !query || text.toLowerCase().includes(query.toLowerCase());
}

function EmptyState({ label }: { label: string }) {
  return (
    <article className="library-empty-state">
      <strong>{label}</strong>
      <span>세린과 함께 기록이 쌓이면 이곳에 차분히 보관됩니다.</span>
    </article>
  );
}

export function LibraryPage({ quests, history, events, messages, memories }: LibraryPageProps) {
  const [scope, setScope] = useState<LibraryScope>("all");
  const [activeTab, setActiveTab] = useState<LibraryTab>("quests");
  const [query, setQuery] = useState("");

  const completedQuests = useMemo(
    () => quests
      .filter((quest) => quest.status === "completed" && inScope(quest.completedAt?.slice(0, 10) ?? quest.dueDate, scope))
      .filter((quest) => includesQuery(`${quest.title} ${quest.description}`, query)),
    [quests, query, scope],
  );
  const scopedEvents = useMemo(
    () => events
      .filter((event) => inScope(event.startAt.slice(0, 10), scope))
      .filter((event) => includesQuery(`${event.title} ${event.description ?? ""}`, query)),
    [events, query, scope],
  );
  const savedMessages = messages
    .filter((message) => message.messageType === "system_notice" || message.messageType === "memory_saved")
    .filter((message) => includesQuery(message.content, query));
  const filteredMemories = memories.filter((memory) => includesQuery(memory.content, query));

  return (
    <section className="library-page simple">
      <header className="library-hero">
        <Badge tone="royal">Kingdom Library</Badge>
        <h1>왕국 도서관</h1>
        <p>완료된 일, 지나간 일정, 다이어리, 인연록, 세린의 장기 기억이 모이는 보관소입니다.</p>
      </header>

      <div className="library-toolbar">
        <label className="library-search">
          <span>검색</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="기록, 일정, 기억 검색" />
        </label>
        <label className="library-scope-select">
          <span>기간</span>
          <select value={scope} onChange={(event) => setScope(event.target.value as LibraryScope)}>
            <option value="all">전체</option>
            <option value="past">과거</option>
            <option value="current">현재</option>
            <option value="future">미래</option>
          </select>
        </label>
      </div>

      <nav className="library-tabs" aria-label="Library categories">
        {tabs.map((tab) => (
          <button key={tab.key} type="button" className={activeTab === tab.key ? "active" : ""} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "quests" && (
        <section className="library-section">
          <div className="library-section-head"><h2>완료 Quest</h2><span>{completedQuests.length}개</span></div>
          {completedQuests.length === 0 ? <EmptyState label="완료된 Quest가 없습니다." /> : completedQuests.map((quest) => (
            <article key={quest.id}><strong>{quest.title}</strong><span>{quest.completedAt?.slice(0, 10) ?? quest.dueDate} · EXP +{quest.expReward}</span></article>
          ))}
        </section>
      )}

      {activeTab === "events" && (
        <section className="library-section">
          <div className="library-section-head"><h2>지난 일정</h2><span>{scopedEvents.length}개</span></div>
          {scopedEvents.length === 0 ? <EmptyState label="보관된 일정이 없습니다." /> : scopedEvents.map((event) => (
            <article key={event.id}><strong>{event.title}</strong><span>{event.startAt.slice(0, 10)} · {event.location ?? "루멘 왕성"}</span></article>
          ))}
        </section>
      )}

      {activeTab === "diary" && (
        <section className="library-section">
          <div className="library-section-head"><h2>Diary</h2><span>준비 중</span></div>
          <EmptyState label="아직 다이어리 기록이 없습니다." />
        </section>
      )}

      {activeTab === "relationships" && (
        <section className="library-section">
          <div className="library-section-head"><h2>인연록</h2><span>준비 중</span></div>
          <EmptyState label="아직 인연록 기록이 없습니다." />
        </section>
      )}

      {activeTab === "memory" && (
        <section className="library-section">
          <div className="library-section-head"><h2>Serin Memory</h2><span>{filteredMemories.length + savedMessages.length}개</span></div>
          {filteredMemories.length === 0 && savedMessages.length === 0 ? <EmptyState label="저장된 세린 기억이 없습니다." /> : (
            <>
              {filteredMemories.map((memory) => (
                <article key={memory.id}><strong>{memory.memoryType}</strong><span>{memory.content}</span></article>
              ))}
              {savedMessages.map((message) => (
                <article key={message.id}><strong>{message.messageType ?? "기록"}</strong><span>{message.content}</span></article>
              ))}
            </>
          )}
        </section>
      )}
    </section>
  );
}
