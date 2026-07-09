import { useMemo, useState } from "react";
import type {
  CalendarEvent,
  DiaryEntry,
  MainQuest,
  Quest,
  QuestHistoryEntry,
  RelationshipContact,
  SerinMemory,
} from "../../../app/types";
import { Badge } from "../../../components/design-system/Badge";

interface LibraryPageProps {
  quests: Quest[];
  questHistory: QuestHistoryEntry[];
  events: CalendarEvent[];
  memories: SerinMemory[];
  mainQuests: MainQuest[];
  contacts: RelationshipContact[];
  diaryEntries: DiaryEntry[];
}

type LibraryFolder = "diary" | "meeting" | "project" | "aiSummary" | "questHistory" | "calendarHistory" | "memory" | "relationship";

interface LibraryEntry {
  id: string;
  title: string;
  meta: string;
  body: string;
}

const folders: Array<{ key: LibraryFolder; label: string }> = [
  { key: "diary", label: "Diary" },
  { key: "meeting", label: "Meeting" },
  { key: "project", label: "Project" },
  { key: "aiSummary", label: "AI Summary" },
  { key: "questHistory", label: "Quest History" },
  { key: "calendarHistory", label: "Calendar History" },
  { key: "memory", label: "Memory" },
  { key: "relationship", label: "Relationship" },
];

const TODAY = "2026-07-09";

// Library = 기록 보관소. Notion처럼 검색 → 필터(폴더) → 목록 → 상세 구조입니다.
// 스크롤 카드 나열이 아니라, 왼쪽 폴더에서 카테고리를 고르고 오른쪽에서
// 목록/상세를 확인하는 구조입니다.
export function LibraryPage({ quests, questHistory, events, memories, mainQuests, contacts, diaryEntries }: LibraryPageProps) {
  const [folder, setFolder] = useState<LibraryFolder>("diary");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const keyword = query.trim().toLowerCase();

  const entriesByFolder: Record<LibraryFolder, LibraryEntry[]> = useMemo(() => {
    const diary: LibraryEntry[] = diaryEntries.map((entry) => ({
      id: entry.id,
      title: `${entry.date} · ${entry.moodLabel} ${entry.moodEmoji}`,
      meta: entry.date,
      body: entry.aiSummary ? `${entry.content}\n\nAI 요약: ${entry.aiSummary}` : entry.content,
    }));

    const meeting: LibraryEntry[] = events
      .filter((event) => event.category === "meeting")
      .map((event) => ({
        id: event.id,
        title: event.title,
        meta: `${event.startAt.slice(0, 10)} ${event.startAt.slice(11, 16)}`,
        body: event.description,
      }));

    const project: LibraryEntry[] = mainQuests.map((mainQuest) => ({
      id: mainQuest.id,
      title: mainQuest.title,
      meta: `${mainQuest.progress}% · ${mainQuest.status === "completed" ? "완료" : mainQuest.status === "onHold" ? "보류" : "진행 중"}`,
      body: mainQuest.description,
    }));

    const aiSummary: LibraryEntry[] = [
      ...diaryEntries
        .filter((entry) => entry.aiSummary)
        .map((entry) => ({ id: `diary-${entry.id}`, title: `다이어리 요약 · ${entry.date}`, meta: "AI", body: entry.aiSummary! })),
      ...contacts
        .filter((contact) => contact.aiSummary)
        .map((contact) => ({ id: `contact-${contact.id}`, title: `${contact.name} 대화 요약`, meta: "AI", body: contact.aiSummary! })),
      ...mainQuests.flatMap((mainQuest) =>
        mainQuest.updates
          .filter((update) => update.author === "serin")
          .map((update) => ({
            id: `mqu-${update.id}`,
            title: `${mainQuest.title} 업데이트 요약`,
            meta: update.date.slice(0, 10),
            body: update.content,
          })),
      ),
    ];

    const questHistoryEntries: LibraryEntry[] = questHistory.map((item) => ({
      id: item.id,
      title: item.note,
      meta: item.completedAt.slice(0, 10),
      body: `EXP +${item.rewardExp}${item.rewardItem ? ` · ${item.rewardItem}` : ""}`,
    }));

    const calendarHistory: LibraryEntry[] = events
      .filter((event) => event.startAt.slice(0, 10) < TODAY || event.status === "completed")
      .sort((a, b) => b.startAt.localeCompare(a.startAt))
      .map((event) => ({
        id: event.id,
        title: event.title,
        meta: event.startAt.slice(0, 10),
        body: `${event.location ?? "루멘 왕성"} · ${event.description}`,
      }));

    const memory: LibraryEntry[] = memories.map((item) => ({
      id: item.id,
      title: item.memoryType,
      meta: item.importance,
      body: item.content,
    }));

    const relationship: LibraryEntry[] = contacts.map((contact) => ({
      id: contact.id,
      title: contact.name,
      meta: contact.organization ?? "",
      body: contact.memo ?? "",
    }));

    return { diary, meeting, project, aiSummary, questHistory: questHistoryEntries, calendarHistory, memory, relationship };
  }, [contacts, diaryEntries, events, mainQuests, memories, questHistory, quests]);

  const visibleEntries = entriesByFolder[folder].filter(
    (entry) => !keyword || entry.title.toLowerCase().includes(keyword) || entry.body.toLowerCase().includes(keyword),
  );
  const selected = visibleEntries.find((entry) => entry.id === selectedId) ?? visibleEntries[0] ?? null;

  function selectFolder(next: LibraryFolder) {
    setFolder(next);
    setSelectedId(null);
  }

  return (
    <section className="library-page-v2">
      <header className="library-hero">
        <Badge tone="royal">Kingdom Library</Badge>
        <h1>왕국 도서관</h1>
        <p>Diary, Meeting, Project, AI Summary, Quest History, Calendar History, Memory, Relationship이 보관되는 기록 보관소입니다.</p>
      </header>

      <div className="library-search-bar">
        <input
          type="search"
          placeholder="도서관 전체 검색"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="왕국도서관 검색"
        />
      </div>

      <div className="library-notion-layout">
        <nav className="library-folder-nav" aria-label="도서관 폴더">
          {folders.map((item) => (
            <button
              key={item.key}
              type="button"
              className={item.key === folder ? "active" : ""}
              onClick={() => selectFolder(item.key)}
            >
              <span>{item.label}</span>
              <em>{entriesByFolder[item.key].length}</em>
            </button>
          ))}
        </nav>

        <div className="library-entry-list">
          {visibleEntries.length === 0 ? (
            <p className="small-copy">이 조건에 맞는 기록이 없습니다.</p>
          ) : (
            visibleEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={entry.id === selected?.id ? "active" : ""}
                onClick={() => setSelectedId(entry.id)}
              >
                <strong>{entry.title}</strong>
                <span>{entry.meta}</span>
              </button>
            ))
          )}
        </div>

        <div className="library-entry-detail">
          {selected ? (
            <>
              <h2>{selected.title}</h2>
              <span>{selected.meta}</span>
              <p>{selected.body || "내용이 없습니다."}</p>
            </>
          ) : (
            <p className="small-copy">왼쪽에서 기록을 선택하세요.</p>
          )}
        </div>
      </div>
    </section>
  );
}
