import { useMemo, useState } from "react";
import type { CalendarEvent, DiaryEntry, MainQuest, Quest, QuestHistoryEntry, RelationshipContact } from "../../../app/types";
import { getKoreanToday } from "../../../app/dateUtils";

interface LibraryPageProps {
  quests: Quest[];
  questHistory: QuestHistoryEntry[];
  events: CalendarEvent[];
  mainQuests: MainQuest[];
  contacts: RelationshipContact[];
  diaryEntries: DiaryEntry[];
}

type LibraryFolder = "project" | "daily" | "side" | "relationship" | "diary";

interface LibraryEntry {
  id: string;
  title: string;
  meta: string;
  body: string;
  date?: string;
}

const folders: Array<{ key: LibraryFolder; title: string; subtitle: string; color: string }> = [
  { key: "project", title: "메인 프로젝트", subtitle: "Main Project", color: "violet" },
  { key: "daily", title: "일일 퀘스트", subtitle: "Daily Quest", color: "blue" },
  { key: "side", title: "서브 퀘스트", subtitle: "Sub Quest", color: "green" },
  { key: "relationship", title: "명함첩", subtitle: "Relationship", color: "red" },
  { key: "diary", title: "다이어리", subtitle: "Diary", color: "navy" },
];

const TODAY = getKoreanToday();
const THIS_YEAR = TODAY.slice(0, 4);
const THIS_MONTH = TODAY.slice(5, 7);

export function LibraryPage({ quests, questHistory, events, mainQuests, contacts, diaryEntries }: LibraryPageProps) {
  const [folder, setFolder] = useState<LibraryFolder>("project");
  const [year, setYear] = useState(THIS_YEAR);
  const [month, setMonth] = useState(THIS_MONTH);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const entriesByFolder: Record<LibraryFolder, LibraryEntry[]> = useMemo(
    () => ({
      project: mainQuests.map((project) => ({
        id: project.id,
        title: project.title,
        meta: `${project.progress}% · ${project.status}`,
        body: project.description,
        date: project.updatedAt.slice(0, 10),
      })),
      daily: quests
        .filter((quest) => quest.type === "daily")
        .map((quest) => ({ id: quest.id, title: quest.title, meta: quest.status, body: quest.description, date: quest.dueDate })),
      side: quests
        .filter((quest) => quest.type === "side")
        .map((quest) => ({ id: quest.id, title: quest.title, meta: quest.status, body: quest.description, date: quest.dueDate })),
      relationship: contacts.map((contact) => ({
        id: contact.id,
        title: contact.name,
        meta: contact.organization ?? "인연록",
        body: contact.memo ?? contact.aiSummary ?? "",
        date: TODAY,
      })),
      diary: diaryEntries.map((entry) => ({
        id: entry.id,
        title: `${entry.date} 일기`,
        meta: entry.moodLabel,
        body: entry.content,
        date: entry.date,
      })),
    }),
    [contacts, diaryEntries, mainQuests, quests],
  );

  const availableYears = useMemo(() => {
    const years = new Set<string>([THIS_YEAR]);
    Object.values(entriesByFolder)
      .flat()
      .forEach((entry) => {
        if (entry.date) years.add(entry.date.slice(0, 4));
      });
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [entriesByFolder]);

  const keyword = query.trim().toLowerCase();
  const filteredEntries = entriesByFolder[folder].filter((entry) => {
    const date = entry.date ?? TODAY;
    const matchesMonth = date.slice(0, 4) === year && date.slice(5, 7) === month;
    const matchesKeyword = !keyword || entry.title.toLowerCase().includes(keyword) || entry.body.toLowerCase().includes(keyword);
    return matchesMonth && matchesKeyword;
  });
  const selected = filteredEntries.find((entry) => entry.id === selectedId) ?? filteredEntries[0] ?? null;
  const totalRecords = Object.values(entriesByFolder).reduce((sum, items) => sum + items.length, 0) + events.length + questHistory.length;

  return (
    <section className="palace-scene library-scene scene-fullbleed">
      <div className="palace-bg" style={{ backgroundImage: 'url("/assets/library.webp")' }} />
      <div className="palace-vignette" />
      <img className="library-princess" src="/assets/princess-full-final.png" alt="공주" />

      <header className="scene-title library-title">
        <span>♕ 왕국 도서관 <em>Royal Library</em></span>
        <p>공주의 모든 기록과 지식이 보관된 곳입니다.</p>
      </header>

      <aside className="palace-panel library-filter-panel">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="검색어를 입력하세요" />
        <label>
          연도
          <select value={year} onChange={(event) => setYear(event.target.value)}>
            {availableYears.map((item) => <option key={item} value={item}>{item}년</option>)}
          </select>
        </label>
        <label>
          월
          <select value={month} onChange={(event) => setMonth(event.target.value)}>
            {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((item) => (
              <option key={item} value={item}>{Number(item)}월</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => { setQuery(""); setYear(THIS_YEAR); setMonth(THIS_MONTH); }}>초기화</button>
      </aside>

      <main className="palace-panel library-main-panel ornamental-panel">
        <h2>카테고리</h2>
        <div className="library-book-row compact-books">
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
          <div className="mini-list-head">
            <h2>{year}년 {Number(month)}월 기록</h2>
            <button type="button">전체 보기</button>
          </div>
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
          <p>{selected?.body ?? "선택한 연월과 카테고리에 맞는 기록이 아직 없습니다."}</p>
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
