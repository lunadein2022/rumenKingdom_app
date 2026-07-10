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

type LibraryFolder = "all" | "project" | "calendar" | "daily" | "side" | "relationship" | "diary";
type MonthFilter = "all" | string;

interface LibraryEntry {
  id: string;
  folder: Exclude<LibraryFolder, "all">;
  title: string;
  meta: string;
  body: string;
  date: string;
  tags: string[];
}

const folders: Array<{ key: LibraryFolder; title: string; subtitle: string }> = [
  { key: "all", title: "전체", subtitle: "All Records" },
  { key: "project", title: "메인 프로젝트", subtitle: "Main Project" },
  { key: "calendar", title: "일정", subtitle: "Calendar" },
  { key: "daily", title: "일일 퀘스트", subtitle: "Daily Quest" },
  { key: "side", title: "서브 퀘스트", subtitle: "Sub Quest" },
  { key: "relationship", title: "명함첩", subtitle: "Relationship" },
  { key: "diary", title: "다이어리", subtitle: "Diary" },
];

const folderLabels: Record<Exclude<LibraryFolder, "all">, string> = {
  project: "메인 프로젝트",
  calendar: "일정",
  daily: "일일 퀘스트",
  side: "서브 퀘스트",
  relationship: "명함첩",
  diary: "다이어리",
};

const TODAY = getKoreanToday();
const THIS_YEAR = TODAY.slice(0, 4);
const THIS_MONTH = TODAY.slice(5, 7);

function dateOf(value?: string) {
  return value?.slice(0, 10) || TODAY;
}

function questStatusLabel(status: Quest["status"]) {
  if (status === "completed") return "완료";
  if (status === "inProgress") return "진행 중";
  return "대기";
}

export function LibraryPage({ quests, questHistory, events, mainQuests, contacts, diaryEntries }: LibraryPageProps) {
  const [folder, setFolder] = useState<LibraryFolder>("all");
  const [year, setYear] = useState(THIS_YEAR);
  const [month, setMonth] = useState<MonthFilter>(THIS_MONTH);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const entries = useMemo<LibraryEntry[]>(() => {
    const projectEntries: LibraryEntry[] = mainQuests.map((project) => ({
      id: `project-${project.id}`,
      folder: "project",
      title: project.title,
      meta: `${project.progress}% · ${project.status}`,
      body: project.description,
      date: dateOf(project.dueDate || project.startDate),
      tags: ["project", project.priority],
    }));

    const eventEntries: LibraryEntry[] = events.map((event) => ({
      id: `calendar-${event.id}`,
      folder: "calendar",
      title: event.title,
      meta: `${event.isAllDay ? "종일" : event.startAt.slice(11, 16)} · ${event.location ?? "왕성"}`,
      body: event.description || "상세 내용이 아직 없습니다.",
      date: dateOf(event.startAt),
      tags: [event.category, event.status],
    }));

    const dailyEntries: LibraryEntry[] = quests
      .filter((quest) => quest.type === "daily")
      .map((quest) => ({
        id: `daily-${quest.id}`,
        folder: "daily",
        title: quest.title,
        meta: `${questStatusLabel(quest.status)} · EXP ${quest.expReward}`,
        body: quest.description,
        date: dateOf(quest.completedAt || quest.dueDate),
        tags: [quest.category, quest.priority],
      }));

    const sideEntries: LibraryEntry[] = quests
      .filter((quest) => quest.type === "side")
      .map((quest) => ({
        id: `side-${quest.id}`,
        folder: "side",
        title: quest.title,
        meta: `${questStatusLabel(quest.status)} · EXP ${quest.expReward}`,
        body: quest.description,
        date: dateOf(quest.completedAt || quest.dueDate),
        tags: [quest.category, quest.priority],
      }));

    const relationshipEntries: LibraryEntry[] = contacts.map((contact) => ({
      id: `relationship-${contact.id}`,
      folder: "relationship",
      title: contact.name,
      meta: [contact.organization, contact.position].filter(Boolean).join(" · ") || "인연록",
      body: contact.memo || contact.aiSummary || "기록된 메모가 아직 없습니다.",
      date: dateOf(contact.lastContactAt || contact.lastMeetingAt),
      tags: ["relationship"],
    }));

    const diaryLibraryEntries: LibraryEntry[] = diaryEntries.map((entry) => ({
      id: `diary-${entry.id}`,
      folder: "diary",
      title: `${entry.date} 일기`,
      meta: entry.moodLabel,
      body: entry.content,
      date: entry.date,
      tags: [entry.moodLabel, ...entry.linkedQuestTitles.slice(0, 2)],
    }));

    return [...projectEntries, ...eventEntries, ...dailyEntries, ...sideEntries, ...relationshipEntries, ...diaryLibraryEntries]
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [contacts, diaryEntries, events, mainQuests, quests]);

  const availableYears = useMemo(() => {
    const years = new Set<string>([THIS_YEAR]);
    entries.forEach((entry) => years.add(entry.date.slice(0, 4)));
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [entries]);

  const keyword = appliedQuery.trim().toLowerCase();
  const filteredEntries = entries.filter((entry) => {
    const matchesFolder = folder === "all" || entry.folder === folder;
    const matchesYear = entry.date.slice(0, 4) === year;
    const matchesMonth = month === "all" || entry.date.slice(5, 7) === month;
    const haystack = `${entry.title} ${entry.meta} ${entry.body} ${entry.tags.join(" ")}`.toLowerCase();
    const matchesKeyword = !keyword || haystack.includes(keyword);
    return matchesFolder && matchesYear && matchesMonth && matchesKeyword;
  });

  const selected = filteredEntries.find((entry) => entry.id === selectedId) ?? filteredEntries[0] ?? null;
  const counts = folders.reduce<Record<LibraryFolder, number>>((acc, item) => {
    acc[item.key] = item.key === "all" ? entries.length : entries.filter((entry) => entry.folder === item.key).length;
    return acc;
  }, {} as Record<LibraryFolder, number>);
  const completedHistoryCount = questHistory.length + quests.filter((quest) => quest.status === "completed").length;

  function runSearch() {
    setAppliedQuery(query);
    setSelectedId(null);
  }

  function resetFilters() {
    setFolder("all");
    setYear(THIS_YEAR);
    setMonth(THIS_MONTH);
    setQuery("");
    setAppliedQuery("");
    setSelectedId(null);
  }

  return (
    <section className="palace-scene library-scene scene-fullbleed">
      <div className="palace-bg" style={{ backgroundImage: 'url("/assets/library.webp")' }} />
      <div className="palace-vignette" />
      <img className="library-princess" src="/assets/princess-full-final.png" alt="공주" />

      <header className="scene-title library-title">
        <span>왕국 도서관 <em>Royal Library</em></span>
        <p>완료한 일, 지난 일정, 프로젝트와 하루의 기록을 찾아봅니다.</p>
      </header>

      <aside className="palace-panel library-filter-panel">
        <h2>기록 검색</h2>
        <div className="library-search-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") runSearch(); }}
            placeholder="검색어를 입력하세요"
          />
          <button type="button" onClick={runSearch}>검색</button>
        </div>
        <label>
          연도
          <select value={year} onChange={(event) => { setYear(event.target.value); setSelectedId(null); }}>
            {availableYears.map((item) => <option key={item} value={item}>{item}년</option>)}
          </select>
        </label>
        <label>
          월
          <select value={month} onChange={(event) => { setMonth(event.target.value); setSelectedId(null); }}>
            <option value="all">전체 월</option>
            {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((item) => (
              <option key={item} value={item}>{Number(item)}월</option>
            ))}
          </select>
        </label>
        <div className="library-folder-list">
          {folders.map((item) => (
            <button key={item.key} type="button" className={folder === item.key ? "active" : ""} onClick={() => { setFolder(item.key); setSelectedId(null); }}>
              <span>{item.title}</span>
              <small>{counts[item.key].toLocaleString()}</small>
            </button>
          ))}
        </div>
        <button type="button" className="ghost-action" onClick={resetFilters}>필터 초기화</button>
      </aside>

      <main className="palace-panel library-main-panel library-record-layout">
        <section className="library-record-list" aria-label="도서관 기록 목록">
          <div className="mini-list-head">
            <h2>{folder === "all" ? "전체 기록" : folders.find((item) => item.key === folder)?.title}</h2>
            <span>{filteredEntries.length.toLocaleString()}개</span>
          </div>
          {filteredEntries.length === 0 ? (
            <article className="library-empty-state">
              <strong>조건에 맞는 기록이 없습니다.</strong>
              <p>연도, 월, 카테고리 또는 검색어를 바꿔 다시 찾아보세요.</p>
            </article>
          ) : (
            filteredEntries.slice(0, 80).map((entry) => (
              <button key={entry.id} type="button" className={`library-record-row ${selected?.id === entry.id ? "active" : ""}`} onClick={() => setSelectedId(entry.id)}>
                <strong>{entry.title}</strong>
                <span>{folderLabels[entry.folder]} · {entry.meta}</span>
                <small>{entry.date}</small>
              </button>
            ))
          )}
        </section>

        <aside className="library-detail-panel" aria-label="선택한 기록 상세">
          {selected ? (
            <>
              <span>{folderLabels[selected.folder]}</span>
              <h2>{selected.title}</h2>
              <p className="library-detail-meta">{selected.date} · {selected.meta}</p>
              <div className="library-detail-body">{selected.body}</div>
              <div className="library-tag-row">
                {selected.tags.map((tag) => <em key={tag}>{tag}</em>)}
              </div>
            </>
          ) : (
            <article className="library-empty-state">
              <strong>기록을 선택하세요.</strong>
              <p>왼쪽 목록에서 항목을 누르면 상세 내용이 이곳에 표시됩니다.</p>
            </article>
          )}
        </aside>

        <section className="library-stats-grid compact-library-stats">
          <article><span>전체 기록</span><strong>{entries.length.toLocaleString()}</strong></article>
          <article><span>완료 이력</span><strong>{completedHistoryCount.toLocaleString()}</strong></article>
          <article><span>일정</span><strong>{events.length.toLocaleString()}</strong></article>
          <article><span>다이어리</span><strong>{diaryEntries.length.toLocaleString()}</strong></article>
        </section>
      </main>
    </section>
  );
}

