import type { CalendarEvent, Quest, ViewKey } from "../../app/types";

interface HomeLeftRailProps {
  dateLine: string;
  greetingLine: string;
  todayEventCount: number;
  todayQuestCount: number;
  alertCount: number;
  memoCount: number;
  todayEvents: CalendarEvent[];
  todayQuests: Quest[];
  onNavigate: (view: ViewKey) => void;
  onToggleQuest: (id: string, completed: boolean) => void;
}

// 왼쪽에 떠 있는 Glass 오버레이 패널 묶음: 오늘 브리핑 / 오늘의 일정 / 오늘의 웨스트.
// 배경(Scene)을 가리는 큰 흰 카드가 아니라, 얇고 반투명한 HUD 패널입니다.
export function HomeLeftRail({
  dateLine,
  greetingLine,
  todayEventCount,
  todayQuestCount,
  alertCount,
  memoCount,
  todayEvents,
  todayQuests,
  onNavigate,
  onToggleQuest,
}: HomeLeftRailProps) {
  return (
    <div className="home-left-rail">
      <section className="home-hud-panel home-briefing-panel">
        <span className="home-briefing-date">{dateLine}</span>
        <p>{greetingLine}</p>
        <div className="home-briefing-counts">
          <button type="button" onClick={() => onNavigate("calendar")}>
            <span>일정</span>
            <strong>{todayEventCount}건</strong>
          </button>
          <button type="button" onClick={() => onNavigate("quests")}>
            <span>퀘스트</span>
            <strong>{todayQuestCount}개</strong>
          </button>
          <button type="button" onClick={() => onNavigate("library")}>
            <span>알림</span>
            <strong>{alertCount}개</strong>
          </button>
          <button type="button" onClick={() => onNavigate("serin")}>
            <span>세린 메모</span>
            <strong>{memoCount}개</strong>
          </button>
        </div>
      </section>

      <section className="home-hud-panel home-schedule-panel">
        <div className="home-hud-panel-head">
          <h2>오늘의 일정</h2>
          <button type="button" onClick={() => onNavigate("calendar")}>›</button>
        </div>
        {todayEvents.length === 0 ? (
          <p className="home-hud-empty">오늘 등록된 일정이 없습니다.</p>
        ) : (
          <ul className="home-schedule-list">
            {todayEvents.slice(0, 4).map((event) => (
              <li key={event.id}>
                <time>{event.startAt.slice(11, 16)}</time>
                <span>{event.title}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="home-hud-panel home-quest-checklist-panel">
        <div className="home-hud-panel-head">
          <h2>오늘의 퀘스트</h2>
          <span>
            {todayQuests.filter((quest) => quest.status === "completed").length}/{todayQuests.length}
          </span>
        </div>
        {todayQuests.length === 0 ? (
          <p className="home-hud-empty">오늘의 퀘스트가 없습니다.</p>
        ) : (
          <ul className="home-quest-checklist">
            {todayQuests.slice(0, 4).map((quest) => {
              const done = quest.status === "completed";
              return (
                <li key={quest.id}>
                  <button
                    type="button"
                    className={done ? "done" : ""}
                    onClick={() => onToggleQuest(quest.id, !done)}
                    aria-pressed={done}
                  >
                    <span className="home-quest-checkbox">{done ? "✓" : ""}</span>
                    <span>{quest.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
