import { useMemo, useState } from "react";
import type { CalendarEvent, Quest, SerinMemory } from "../../../app/types";
import { Badge } from "../../../components/design-system/Badge";

interface LibraryPageProps {
  quests: Quest[];
  events: CalendarEvent[];
  memories: SerinMemory[];
}

type LibraryScope = "past" | "current" | "future" | "all";

const scopeOptions: Array<{ key: LibraryScope; label: string }> = [
  { key: "past", label: "이전" },
  { key: "current", label: "현재" },
  { key: "future", label: "이후" },
  { key: "all", label: "전체" },
];

const today = "2026-07-09";

function inScope(dateStr: string, scope: LibraryScope) {
  if (scope === "all") return true;
  if (scope === "past") return dateStr < today;
  if (scope === "future") return dateStr > today;
  return dateStr === today;
}

export function LibraryPage({ quests, events, memories }: LibraryPageProps) {
  const [scope, setScope] = useState<LibraryScope>("all");
  const [query, setQuery] = useState("");
  const keyword = query.trim().toLowerCase();

  const completedQuests = useMemo(
    () =>
      quests
        .filter((quest) => quest.status === "completed")
        .filter((quest) => inScope((quest.completedAt ?? quest.dueDate).slice(0, 10), scope))
        .filter((quest) => !keyword || quest.title.toLowerCase().includes(keyword)),
    [quests, scope, keyword],
  );

  const scopedEvents = useMemo(
    () =>
      events
        .filter((event) => inScope(event.startAt.slice(0, 10), scope))
        .filter((event) => !keyword || event.title.toLowerCase().includes(keyword)),
    [events, scope, keyword],
  );

  const scopedMemories = useMemo(
    () =>
      memories
        .filter((memory) => inScope(memory.createdAt.slice(0, 10), scope))
        .filter((memory) => !keyword || memory.content.toLowerCase().includes(keyword)),
    [memories, scope, keyword],
  );

  return (
    <section className="library-page">
      <header className="library-hero">
        <Badge tone="royal">Kingdom Library</Badge>
        <h1>왕국 도서관</h1>
        <p>완료된 Quest, 지난 일정, 다이어리, 세린 기록, 연락처가 저장되는 Princess OS의 보관소입니다.</p>
      </header>

      <div className="library-toolbar">
        <input
          type="search"
          placeholder="Quest, 일정, 세린 기록 검색"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="왕국도서관 검색"
        />
        <select value={scope} onChange={(event) => setScope(event.target.value as LibraryScope)} aria-label="기간 필터">
          {scopeOptions.map((option) => (
            <option key={option.key} value={option.key}>{option.label}</option>
          ))}
        </select>
      </div>

      <section className="library-section">
        <div className="library-section-head">
          <h2>완료 Quest</h2>
          <span>{completedQuests.length}개</span>
        </div>
        {completedQuests.length === 0 ? (
          <p>이 조건에 맞는 완료 Quest가 없습니다.</p>
        ) : (
          completedQuests.map((quest) => (
            <article key={quest.id}>
              <strong>{quest.title}</strong>
              <span>{(quest.completedAt ?? quest.dueDate).slice(0, 10)} · EXP +{quest.expReward}</span>
            </article>
          ))
        )}
      </section>

      <section className="library-section">
        <div className="library-section-head">
          <h2>일정</h2>
          <span>{scopedEvents.length}개</span>
        </div>
        {scopedEvents.length === 0 ? (
          <p>이 조건에 맞는 일정이 없습니다.</p>
        ) : (
          scopedEvents.map((event) => (
            <article key={event.id}>
              <strong>{event.title}</strong>
              <span>{event.startAt.slice(0, 10)} · {event.location ?? "루멘 왕성"}</span>
            </article>
          ))
        )}
      </section>

      <section className="library-section">
        <div className="library-section-head">
          <h2>세린 기억</h2>
          <span>{scopedMemories.length}개</span>
        </div>
        <p className="small-copy">화면 대화는 새로고침하면 사라지지만, 세린이 "기억해줘"로 저장한 내용은 여기 남습니다.</p>
        {scopedMemories.length === 0 ? (
          <p>이 조건에 맞는 세린 기억이 없습니다.</p>
        ) : (
          scopedMemories.map((memory) => (
            <article key={memory.id}>
              <strong>{memory.memoryType}</strong>
              <span>{memory.content}</span>
            </article>
          ))
        )}
      </section>

      <section className="library-section">
        <div className="library-section-head">
          <h2>다이어리 / 연락처</h2>
          <span>준비됨</span>
        </div>
        <p>Princess Diary와 Relationship Book은 이 도서관으로 저장되도록 연결 지점을 준비했습니다.</p>
      </section>
    </section>
  );
}
