import { useState } from "react";
import type { CalendarEvent, MainQuest, Quest, RelationshipContact } from "../../../app/types";
import { Badge } from "../../../components/design-system/Badge";
import { Button } from "../../../components/design-system/Button";
import { ProgressBar } from "../../../components/design-system/ProgressBar";

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

// Office = 메인퀘스트(=프로젝트) 관리 공간입니다. 메인퀘스트는 To-Do가 아니라
// 챕터/서브퀘스트/일일퀘스트/반복퀘스트/일정/업데이트로그/관련 인연/첨부파일/
// 보상을 함께 가진 장기 프로젝트 단위입니다.
export function OfficePage({ mainQuests, quests, events, contacts, onToggleChapter, onAddUpdate }: OfficePageProps) {
  const [selectedId, setSelectedId] = useState(mainQuests[0]?.id ?? "");
  const [draftUpdate, setDraftUpdate] = useState("");
  const selected = mainQuests.find((mq) => mq.id === selectedId) ?? mainQuests[0];

  const linkedQuests = (ids: string[]) => quests.filter((quest) => ids.includes(quest.id));
  const linkedEvents = (ids: string[]) => events.filter((event) => ids.includes(event.id));
  const linkedContacts = (ids: string[]) => contacts.filter((contact) => ids.includes(contact.id));

  function submitUpdate() {
    if (!selected || !draftUpdate.trim()) return;
    onAddUpdate(selected.id, draftUpdate.trim());
    setDraftUpdate("");
  }

  return (
    <section className="office-domain-page scene-fullbleed">
      <div className="office-scene-backdrop" style={{ backgroundImage: 'url("/assets/office.webp")' }} />
      <div className="office-scene-content">
      <header className="office-hero">
        <Badge tone="royal">Office</Badge>
        <h1>집무실</h1>
        <p>메인퀘스트(프로젝트)를 관리하는 공간입니다. 챕터, 실행 퀘스트, 일정, 업데이트 로그가 한곳에 모입니다.</p>
      </header>

      <div className="office-main-quest-list">
        {mainQuests.map((mainQuest) => (
          <button
            key={mainQuest.id}
            type="button"
            className={`office-main-quest-card${mainQuest.id === selected?.id ? " active" : ""}`}
            onClick={() => setSelectedId(mainQuest.id)}
          >
            <div className="office-main-quest-card-head">
              <strong>{mainQuest.title}</strong>
              <Badge tone={mainQuest.status === "completed" ? "success" : "soft"}>{statusLabel[mainQuest.status]}</Badge>
            </div>
            <ProgressBar value={mainQuest.progress} label={`${mainQuest.title} progress`} />
            <span>{mainQuest.progress}% · 마감 {mainQuest.dueDate}</span>
          </button>
        ))}
      </div>

      {selected && (
        <section className="office-main-quest-detail">
          <header>
            <div>
              <Badge tone="gold">메인퀘스트</Badge>
              <h2>{selected.title}</h2>
              <p>{selected.description}</p>
            </div>
            <div className="office-detail-stat">
              <strong>EXP {selected.expTotal} / {selected.rewardExp}</strong>
              <span>보상 {selected.rewardGold} Gold</span>
            </div>
          </header>

          <div className="office-detail-grid">
            <section>
              <h3>챕터 / 마일스톤</h3>
              <ul className="office-chapter-list">
                {selected.chapters.map((chapter) => (
                  <li key={chapter.id}>
                    <button type="button" className={chapter.done ? "done" : ""} onClick={() => onToggleChapter(selected.id, chapter.id)}>
                      <span className="office-chapter-check">{chapter.done ? "✓" : ""}</span>
                      <span>{chapter.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3>서브 퀘스트</h3>
              {linkedQuests(selected.subQuestIds).length === 0 ? (
                <p className="small-copy">연결된 서브 퀘스트가 없습니다.</p>
              ) : (
                linkedQuests(selected.subQuestIds).map((quest) => (
                  <p key={quest.id}>⭐ {quest.title} · {quest.status === "completed" ? "완료" : `${quest.progress}%`}</p>
                ))
              )}

              <h3>일일 / 반복 퀘스트</h3>
              {[...linkedQuests(selected.dailyQuestIds), ...linkedQuests(selected.routineQuestIds)].map((quest) => (
                <p key={quest.id}>{quest.type === "daily" ? "☀" : "🔄"} {quest.title} · {quest.status === "completed" ? "완료" : `${quest.progress}%`}</p>
              ))}
            </section>

            <section>
              <h3>연결된 일정</h3>
              {linkedEvents(selected.linkedCalendarEventIds).length === 0 ? (
                <p className="small-copy">연결된 일정이 없습니다.</p>
              ) : (
                linkedEvents(selected.linkedCalendarEventIds).map((event) => (
                  <p key={event.id}>📅 {event.startAt.slice(0, 10)} {event.startAt.slice(11, 16)} · {event.title}</p>
                ))
              )}

              <h3>관련 인연</h3>
              {linkedContacts(selected.relatedContactIds).length === 0 ? (
                <p className="small-copy">연결된 인연이 없습니다.</p>
              ) : (
                linkedContacts(selected.relatedContactIds).map((contact) => <p key={contact.id}>👤 {contact.name}</p>)
              )}

              <h3>첨부파일</h3>
              {selected.attachedFiles.length === 0 ? (
                <p className="small-copy">첨부된 파일이 없습니다.</p>
              ) : (
                selected.attachedFiles.map((file) => <p key={file.id}>📎 {file.name}</p>)
              )}
            </section>
          </div>

          <section className="office-update-log">
            <h3>업데이트 로그</h3>
            <div className="office-update-input">
              <input
                type="text"
                placeholder="오늘 진행한 내용을 기록하세요"
                value={draftUpdate}
                onChange={(event) => setDraftUpdate(event.target.value)}
              />
              <Button size="sm" onClick={submitUpdate}>기록</Button>
            </div>
            <ul>
              {selected.updates.map((update) => (
                <li key={update.id}>
                  <span>{update.date.slice(0, 10)} · {update.author === "serin" ? "세린" : "공주"}</span>
                  <p>{update.content}</p>
                </li>
              ))}
            </ul>
          </section>
        </section>
      )}
      </div>
    </section>
  );
}
