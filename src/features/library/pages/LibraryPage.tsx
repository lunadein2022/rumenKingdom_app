import { useMemo, useState } from "react";
import type { CalendarEvent, Quest, SerinMemory } from "../../../app/types";
import { Badge } from "../../../components/design-system/Badge";

interface LibraryPageProps {
  quests: Quest[];
  events: CalendarEvent[];
  memories: SerinMemory[];
}

type LibraryTab = "quests" | "events" | "diary" | "relationships" | "memory" | "chronicle";

const tabs: Array<{ key: LibraryTab; label: string }> = [
  { key: "quests", label: "완료 Quest" },
  { key: "events", label: "지난 일정" },
  { key: "diary", label: "Diary" },
  { key: "relationships", label: "인연록" },
  { key: "memory", label: "Memory" },
  { key: "chronicle", label: "왕실연대기" },
];

// Diary/인연록/왕실연대기는 아직 전용 도메인/mock 데이터가 없어서, 탭 구조를
// 보여주기 위한 최소 mock list입니다. 실제 데이터 연결 전까지 이 배열만 채워두면 됩니다.
interface DiaryEntry {
  id: string;
  date: string;
  title: string;
  mood: string;
  excerpt: string;
}

const mockDiaryEntries: DiaryEntry[] = [
  {
    id: "diary-001",
    date: "2026-07-08",
    title: "차분했던 하루",
    mood: "평온",
    excerpt: "오늘은 계획한 일정을 무리 없이 마쳤다. 세린이 중간중간 챙겨준 덕분에 여유가 있었다.",
  },
  {
    id: "diary-002",
    date: "2026-07-05",
    title: "바빴던 하루",
    mood: "피곤",
    excerpt: "회의가 연달아 있어서 정신없었지만, 저녁에는 정원에서 잠깐 쉴 수 있었다.",
  },
];

interface RelationshipEntry {
  id: string;
  name: string;
  relation: string;
  lastContact: string;
  note: string;
}

const mockRelationshipEntries: RelationshipEntry[] = [
  {
    id: "rel-001",
    name: "레오나 공작",
    relation: "정치적 동맹",
    lastContact: "2026-07-02",
    note: "왕국 회의에서 자주 마주치는 인물. 신중하게 대할 것.",
  },
  {
    id: "rel-002",
    name: "이든 경",
    relation: "호위 기사",
    lastContact: "2026-07-09",
    note: "가장 신뢰하는 호위. 정원 산책에도 종종 동행.",
  },
];

interface ChronicleEntry {
  id: string;
  date: string;
  title: string;
  description: string;
}

const mockChronicleEntries: ChronicleEntry[] = [
  {
    id: "chr-001",
    date: "2026-07-01",
    title: "루멘 왕성 입성",
    description: "공주가 루멘 왕성에서 새로운 하루를 시작함.",
  },
  {
    id: "chr-002",
    date: "2026-07-09",
    title: "세린과의 여정 시작",
    description: "AI 메이드 세린과 함께 왕국의 일정과 Quest를 정리하기 시작함.",
  },
];

export function LibraryPage({ quests, events, memories }: LibraryPageProps) {
  const [tab, setTab] = useState<LibraryTab>("quests");
  const [query, setQuery] = useState("");
  const keyword = query.trim().toLowerCase();

  const completedQuests = useMemo(
    () =>
      quests
        .filter((quest) => quest.status === "completed")
        .filter((quest) => !keyword || quest.title.toLowerCase().includes(keyword)),
    [quests, keyword],
  );

  const pastEvents = useMemo(
    () =>
      events
        .filter((event) => event.status === "completed" || event.startAt.slice(0, 10) <= "2026-07-09")
        .filter((event) => !keyword || event.title.toLowerCase().includes(keyword))
        .sort((a, b) => b.startAt.localeCompare(a.startAt)),
    [events, keyword],
  );

  const filteredMemories = useMemo(
    () => memories.filter((memory) => !keyword || memory.content.toLowerCase().includes(keyword)),
    [memories, keyword],
  );

  const filteredDiary = useMemo(
    () => mockDiaryEntries.filter((entry) => !keyword || entry.title.toLowerCase().includes(keyword)),
    [keyword],
  );

  const filteredRelationships = useMemo(
    () => mockRelationshipEntries.filter((entry) => !keyword || entry.name.toLowerCase().includes(keyword)),
    [keyword],
  );

  const filteredChronicle = useMemo(
    () => mockChronicleEntries.filter((entry) => !keyword || entry.title.toLowerCase().includes(keyword)),
    [keyword],
  );

  return (
    <section className="library-page">
      <header className="library-hero">
        <Badge tone="royal">Kingdom Library</Badge>
        <h1>왕국 도서관</h1>
        <p>완료된 Quest, 지난 일정, 다이어리, 인연록, 세린 기억, 왕실연대기가 저장되는 Princess OS의 보관소입니다.</p>
      </header>

      <div className="library-toolbar">
        <input
          type="search"
          placeholder="도서관 전체 검색"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="왕국도서관 검색"
        />
      </div>

      <nav className="library-tabs" aria-label="도서관 카테고리">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            className={item.key === tab ? "active" : ""}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "quests" && (
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
      )}

      {tab === "events" && (
        <section className="library-section">
          <div className="library-section-head">
            <h2>지난 일정</h2>
            <span>{pastEvents.length}개</span>
          </div>
          {pastEvents.length === 0 ? (
            <p>지난 일정이 없습니다.</p>
          ) : (
            pastEvents.map((event) => (
              <article key={event.id}>
                <strong>{event.title}</strong>
                <span>{event.startAt.slice(0, 10)} · {event.location ?? "루멘 왕성"}</span>
              </article>
            ))
          )}
        </section>
      )}

      {tab === "diary" && (
        <section className="library-section">
          <div className="library-section-head">
            <h2>Diary</h2>
            <span>{filteredDiary.length}개</span>
          </div>
          <p className="small-copy">임시 mock 데이터입니다. 실제 Diary 저장 흐름은 아직 연결되지 않았습니다.</p>
          {filteredDiary.length === 0 ? (
            <p>이 조건에 맞는 Diary가 없습니다.</p>
          ) : (
            filteredDiary.map((entry) => (
              <article key={entry.id}>
                <strong>{entry.title}</strong>
                <span>{entry.date} · {entry.mood}</span>
                <p>{entry.excerpt}</p>
              </article>
            ))
          )}
        </section>
      )}

      {tab === "relationships" && (
        <section className="library-section">
          <div className="library-section-head">
            <h2>인연록</h2>
            <span>{filteredRelationships.length}개</span>
          </div>
          <p className="small-copy">임시 mock 데이터입니다. 실제 연락처/인연록 저장 흐름은 아직 연결되지 않았습니다.</p>
          {filteredRelationships.length === 0 ? (
            <p>이 조건에 맞는 인연이 없습니다.</p>
          ) : (
            filteredRelationships.map((entry) => (
              <article key={entry.id}>
                <strong>{entry.name}</strong>
                <span>{entry.relation} · 최근 연락 {entry.lastContact}</span>
                <p>{entry.note}</p>
              </article>
            ))
          )}
        </section>
      )}

      {tab === "memory" && (
        <section className="library-section">
          <div className="library-section-head">
            <h2>세린 기억</h2>
            <span>{filteredMemories.length}개</span>
          </div>
          <p className="small-copy">화면 대화는 새로고침하면 사라지지만, 세린이 "기억해줘"로 저장한 내용은 여기 남습니다.</p>
          {filteredMemories.length === 0 ? (
            <p>이 조건에 맞는 세린 기억이 없습니다.</p>
          ) : (
            filteredMemories.map((memory) => (
              <article key={memory.id}>
                <strong>{memory.memoryType}</strong>
                <span>{memory.content}</span>
              </article>
            ))
          )}
        </section>
      )}

      {tab === "chronicle" && (
        <section className="library-section">
          <div className="library-section-head">
            <h2>왕실연대기</h2>
            <span>{filteredChronicle.length}개</span>
          </div>
          <p className="small-copy">임시 mock 데이터입니다. 실제 이벤트 기반 연대기 생성은 아직 연결되지 않았습니다.</p>
          {filteredChronicle.length === 0 ? (
            <p>이 조건에 맞는 기록이 없습니다.</p>
          ) : (
            filteredChronicle.map((entry) => (
              <article key={entry.id}>
                <strong>{entry.title}</strong>
                <span>{entry.date}</span>
                <p>{entry.description}</p>
              </article>
            ))
          )}
        </section>
      )}
    </section>
  );
}
