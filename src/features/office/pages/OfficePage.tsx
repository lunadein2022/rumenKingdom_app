import { useState } from "react";
import type { CalendarEvent, MainQuest, Quest, RelationshipContact } from "../../../app/types";
import { Button } from "../../../components/design-system/Button";

interface OfficePageProps {
  mainQuests: MainQuest[];
  quests: Quest[];
  events: CalendarEvent[];
  contacts: RelationshipContact[];
  onToggleChapter: (mainQuestId: string, chapterId: string) => void;
  onAddUpdate: (mainQuestId: string, content: string) => void;
}

const statusLabel: Record<MainQuest["status"], string> = {
  active: "진행 중",
  onHold: "보류",
  completed: "완료",
};

export function OfficePage({ mainQuests, quests, events, contacts, onToggleChapter, onAddUpdate }: OfficePageProps) {
  const [selectedId, setSelectedId] = useState(mainQuests[0]?.id ?? "");
  const [draftUpdate, setDraftUpdate] = useState("");
  const selected = mainQuests.find((mq) => mq.id === selectedId) ?? mainQuests[0];

  const linkedQuests = selected ? quests.filter((quest) => [...selected.subQuestIds, ...selected.dailyQuestIds, ...selected.routineQuestIds].includes(quest.id)) : [];
  const linkedEvents = selected ? events.filter((event) => selected.linkedCalendarEventIds.includes(event.id)) : [];
  const linkedContacts = selected ? contacts.filter((contact) => selected.relatedContactIds.includes(contact.id)) : [];

  function submitUpdate() {
    if (!selected || !draftUpdate.trim()) return;
    onAddUpdate(selected.id, draftUpdate.trim());
    setDraftUpdate("");
  }

  return (
    <section className="palace-scene office-scene scene-fullbleed">
      <div className="palace-bg" style={{ backgroundImage: 'url("/assets/office.webp")' }} />
      <div className="palace-vignette" />
      <img className="office-princess" src="/assets/princess-bust-transparent.webp" alt="공주" />
      <img className="office-serin" src="/assets/serin-full-transparent.webp" alt="세린" />

      <header className="scene-title office-title">
        <span>♕ 집무실 <em>Office</em></span>
        <p>프로젝트와 Quest를 관리하고, 왕국의 목표를 달성해 나가세요.</p>
      </header>

      <div className="office-tabs palace-panel flat-panel">
        <button type="button">일일 Quest</button>
        <button type="button">서브 Quest</button>
        <button type="button" className="active">메인 Quest (프로젝트)</button>
      </div>

      <aside className="palace-panel office-project-list">
        <div className="mini-list-head"><h2>메인 프로젝트 목록</h2><button type="button">+ 새 프로젝트</button></div>
        {mainQuests.map((mainQuest) => (
          <button
            key={mainQuest.id}
            type="button"
            className={`project-select ${mainQuest.id === selected?.id ? "active" : ""}`}
            onClick={() => setSelectedId(mainQuest.id)}
          >
            <strong>{mainQuest.title}</strong>
            <span>{mainQuest.description}</span>
            <b><i style={{ width: `${mainQuest.progress}%` }} /></b>
            <em>진행률 {mainQuest.progress}%</em>
          </button>
        ))}
      </aside>

      {selected && (
        <main className="palace-panel office-detail-panel">
          <header>
            <div>
              <span className="panel-eyebrow">{statusLabel[selected.status]}</span>
              <h1>{selected.title}</h1>
              <p>{selected.description}</p>
            </div>
            <strong>진행률 {selected.progress}%</strong>
          </header>
          <div className="office-progress"><i style={{ width: `${selected.progress}%` }} /></div>

          <nav className="office-detail-tabs">
            <button className="active" type="button">개요</button>
            <button type="button">챕터</button>
            <button type="button">업데이트</button>
            <button type="button">관련 일정</button>
            <button type="button">문서</button>
          </nav>

          <section className="office-overview-grid">
            <article><span>프로젝트 시작</span><strong>{selected.startDate}</strong></article>
            <article><span>예상 완료</span><strong>{selected.dueDate}</strong></article>
            <article><span>참여 인연</span><strong>{linkedContacts.length}명</strong></article>
            <article><span>획득 EXP</span><strong>{selected.expTotal.toLocaleString()}</strong></article>
          </section>

          <section className="chapter-track">
            <h2>챕터 / 마일스톤</h2>
            {selected.chapters.map((chapter) => (
              <button key={chapter.id} type="button" className={chapter.done ? "done" : ""} onClick={() => onToggleChapter(selected.id, chapter.id)}>
                <span>{chapter.done ? "✓" : ""}</span>{chapter.title}
              </button>
            ))}
          </section>

          <section className="office-update-input">
            <input value={draftUpdate} onChange={(event) => setDraftUpdate(event.target.value)} placeholder="오늘 진행한 내용을 기록하세요" />
            <Button size="sm" onClick={submitUpdate}>기록</Button>
          </section>
        </main>
      )}

      <aside className="palace-panel office-side-status">
        <h2>최근 진행 상황</h2>
        {selected?.updates.slice(0, 4).map((update) => (
          <p key={update.id}><span>{update.content}</span><time>{update.date.slice(0, 10)}</time></p>
        ))}
        <h2>관련 Quest</h2>
        {linkedQuests.slice(0, 4).map((quest) => (
          <p key={quest.id}><span>{quest.title}</span><time>{quest.status === "completed" ? "완료" : `${quest.progress}%`}</time></p>
        ))}
        <h2>관련 일정</h2>
        {linkedEvents.slice(0, 3).map((event) => (
          <p key={event.id}><span>{event.title}</span><time>{event.startAt.slice(5, 10)}</time></p>
        ))}
      </aside>
    </section>
  );
}
