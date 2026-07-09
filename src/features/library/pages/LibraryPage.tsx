import type { CalendarEvent, Quest, QuestHistoryEntry, SerinMessage } from "../../../app/types";
import { Badge } from "../../../components/design-system/Badge";

interface LibraryPageProps {
  quests: Quest[];
  history: QuestHistoryEntry[];
  events: CalendarEvent[];
  messages: SerinMessage[];
}

export function LibraryPage({ quests, history, events, messages }: LibraryPageProps) {
  const completedQuests = quests.filter((quest) => quest.status === "completed");
  const pastEvents = events.filter((event) => event.startAt.slice(0, 10) < "2026-07-09" || event.status === "completed");
  const savedMessages = messages.filter((message) => message.messageType === "system_notice" || message.messageType === "memory_saved");

  return (
    <section className="library-page">
      <header className="library-hero">
        <Badge tone="royal">Kingdom Library</Badge>
        <h1>왕국 도서관</h1>
        <p>완료된 Quest, 지난 일정, 다이어리, 세린 기록, 연락처가 저장되는 Princess OS의 보관소입니다.</p>
      </header>

      <section className="library-section">
        <div className="library-section-head">
          <h2>완료 Quest</h2>
          <span>{completedQuests.length}개</span>
        </div>
        {completedQuests.map((quest) => (
          <article key={quest.id}>
            <strong>{quest.title}</strong>
            <span>{quest.completedAt?.slice(0, 10) ?? quest.dueDate} · EXP +{quest.expReward}</span>
          </article>
        ))}
      </section>

      <section className="library-section">
        <div className="library-section-head">
          <h2>지난 일정</h2>
          <span>{pastEvents.length}개</span>
        </div>
        {pastEvents.length === 0 ? <p>아직 보관된 지난 일정이 없습니다.</p> : pastEvents.map((event) => (
          <article key={event.id}>
            <strong>{event.title}</strong>
            <span>{event.startAt.slice(0, 10)} · {event.location ?? "루멘 왕성"}</span>
          </article>
        ))}
      </section>

      <section className="library-section">
        <div className="library-section-head">
          <h2>세린 기록</h2>
          <span>{savedMessages.length}개</span>
        </div>
        {savedMessages.length === 0 ? <p>아직 보관된 세린 기록이 없습니다.</p> : savedMessages.slice(0, 5).map((message) => (
          <article key={message.id}>
            <strong>{message.messageType ?? "text"}</strong>
            <span>{message.content}</span>
          </article>
        ))}
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
