import { useMemo, useState } from "react";
import type { CalendarEvent, DiaryEntry, MainQuest, Quest, QuestHistoryEntry, RelationshipContact, SerinMemory } from "../../../app/types";
import { getKoreanToday } from "../../../app/dateUtils";

interface LibraryPageProps {
  quests: Quest[];
  questHistory: QuestHistoryEntry[];
  events: CalendarEvent[];
  memories: SerinMemory[];
  mainQuests: MainQuest[];
  contacts: RelationshipContact[];
  diaryEntries: DiaryEntry[];
}

type LibraryFolder = "project" | "daily" | "side" | "relationship" | "diaryPast" | "diaryPresent" | "memory";
type PeriodFilter = "all" | "past" | "present" | "future";

interface LibraryEntry { id: string; title: string; meta: string; body: string; date?: string; }

const folders: Array<{ key: LibraryFolder; title: string; subtitle: string; color: string }> = [
  { key: "project", title: "메인 프로젝트", subtitle: "Main Project", color: "violet" },
  { key: "daily", title: "일일 퀘스트", subtitle: "Daily Quest", color: "blue" },
  { key: "side", title: "서브 퀘스트", subtitle: "Sub Quest", color: "green" },
  { key: "relationship", title: "명함첩", subtitle: "Relationship", color: "red" },
  { key: "diaryPast", title: "다이어리 (전)", subtitle: "Diary Past", color: "brown" },
  { key: "diaryPresent", title: "다이어리 (현)", subtitle: "Diary Present", color: "navy" },
  { key: "memory", title: "세린 기억", subtitle: "Memory", color: "purple" },
];

const TODAY = getKoreanToday();

export function LibraryPage({ quests, questHistory, events, memories, mainQuests, contacts, diaryEntries }: LibraryPageProps) {
  const [folder, setFolder] = useState<LibraryFolder>("project");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const entriesByFolder: Record<LibraryFolder, LibraryEntry[]> = useMemo(() => {
    return {
      project: mainQuests.map((project) => ({ id: project.id, title: project.title, meta: `${project.progress}% · ${project.status}`, body: project.description, date: project.updatedAt.slice(0, 10) })),
      daily: quests.filter((quest) => quest.type === "daily").map((quest) => ({ id: quest.id, title: quest.title, meta: quest.status, body: quest.description, date: quest.dueDate })),
      side: quests.filter((quest) => quest.type === "side").map((quest) => ({ id: quest.id, title: quest.title, meta: quest.status, body: quest.description, date: quest.dueDate })),
      relationship: contacts.map((contact) => ({ id: contact.id, title: contact.name, meta: contact.organization ?? "인연록", body: contact.memo ?? contact.aiSummary ?? "", date: TODAY })),
      diaryPast: diaryEntries.filter((entry) => entry.date < TODAY).map((entry) => ({ id: entry.id, title: `${entry.date} 일기`, meta: entry.moodLabel, body: entry.content, date: entry.date })),
      diaryPresent: diaryEntries.filter((entry) => entry.date >= TODAY).map((entry) => ({ id: entry.id, title: `${entry.date} 일기`, meta: entry.moodLabel, body: entry.content, date: entry.date })),
      memory: memories.map((memory) => ({ id: memory.id, title: memory.memoryType, meta: memory.importance, body: memory.content, date: memory.createdAt.slice(0, 10) })),
    };
  }, [contacts, diaryEntries, mainQuests, memories, questHistory, quests]);

  const keyword = query.trim().toLowerCase();
  const filteredEntries = entriesByFolder[folder].filter((entry) => {
    const matchesKeyword = !keyword || entry.title.toLowerCase().includes(keyword) || entry.body.toLowerCase().includes(keyword);
    const date = entry.date ?? TODAY;
    const matchesPeriod = period === "all" || (period === "past" && date < TODAY) || (period === "present" && date === TODAY) || (period === "future" && date > TODAY);
    return matchesKeyword && matchesPeriod;
  });
  const selected = filteredEntries.find((entry) => entry.id === selectedId) ?? filteredEntries[0] ?? null;
  const totalRecords = Object.values(entriesByFolder).reduce((sum, items) => sum + items.length, 0) + events.length + questHistory.length;

  return (
    <section className="palace-scene library-scene scene-fullbleed">
      <div className="palace-bg" style={{ backgroundImage: 'url("/assets/library.webp")' }} />
      <div className="palace-vignette" />
      <img className="library-princess" src="/assets/princess-bust-transparent.webp" alt="공주" />

      <header className="scene-title library-title">
        <span>♕ 왕국 도서관 <em>Royal Library</em></span>
        <p>공주의 모든 기록과 지식이 보관된 곳입니다.</p>
      </header>

      <aside className="palace-panel library-filter-panel">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="검색어를 입력하세요" />
        <label>기간
          <select value={period} onChange={(event) => setPeriod(event.target.value as PeriodFilter)}>
            <option value="all">전체 기간</option>
            <option value="past">과거</option>
            <option value="present">현재</option>
            <option value="future">미래</option>
          </select>
        </label>
        <button type="button" onClick={() => { setQuery(""); setPeriod("all"); }}>초기화</button>
      </aside>

      <main className="palace-panel library-main-panel ornamental-panel">
        <h2>카테고리</h2>
        <div className="library-book-row">
          {folders.map((item) => (
            <button key={item.key} type="button" className={`library-book ${item.color} ${folder === item.key ? "active" : ""}`} onClick={() => { setFolder(item.key); setSelectedId(null); }}>
              <span>♕</span>
              <strong>{item.title}</strong>
              <em>{item.subtitle}</em>
              <b>{entriesByFolder[item.key].length.toLocaleString()}</b>
              <small>개 기록</small>
            </button>
          ))}
        </div>

        <section className="recent-records">
          <div className="mini-list-head"><h2>최근 열람한 기록</h2><button type="button">전체 보기</button></div>
          <div className="record-strip">
            {filteredEntries.slice(0, 6).map((entry) => (
              <button key={entry.id} type="button" onClick={() => setSelectedId(entry.id)} className={entry.id === selected?.id ? "active" : ""}>
                <strong>{entry.title}</strong><span>{entry.meta}</span><small>{entry.date}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="library-detail-preview">
          <h2>{selected?.title ?? "기록이 없습니다"}</h2>
          <p>{selected?.body ?? "선택한 조건에 맞는 기록이 아직 없습니다."}</p>
        </section>

        <section className="library-stats-grid">
          <article><span>총 기록 수</span><strong>{totalRecords.toLocaleString()}</strong></article>
          <article><span>메인 프로젝트</span><strong>{mainQuests.length}</strong></article>
          <article><span>일일 Quest</span><strong>{quests.filter((q) => q.type === "daily").length}</strong></article>
          <article><span>서브 Quest</span><strong>{quests.filter((q) => q.type === "side").length}</strong></article>
          <article><span>명함첩</span><strong>{contacts.length}</strong></article>
          <article><span>다이어리</span><strong>{diaryEntries.length}</strong></article>
        </section>
      </main>
    </section>
  );
}
