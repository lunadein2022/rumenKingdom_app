import { useState } from "react";
import type { MainQuest, RelationshipContact } from "../../../app/types";
import { Badge } from "../../../components/design-system/Badge";

interface RelationshipPageProps {
  contacts: RelationshipContact[];
  mainQuests: MainQuest[];
}

function stars(affinity: number) {
  return "★".repeat(affinity) + "☆".repeat(Math.max(0, 5 - affinity));
}

// 인연록(Relationship) — 왕국도서관과는 별도인 독립 도메인입니다.
export function RelationshipPage({ contacts, mainQuests }: RelationshipPageProps) {
  const [selectedId, setSelectedId] = useState(contacts[0]?.id ?? "");
  const selected = contacts.find((contact) => contact.id === selectedId) ?? contacts[0];
  const mainQuestTitle = new Map(mainQuests.map((mq) => [mq.id, mq.title]));

  return (
    <section className="relationship-domain-page">
      <img className="scene-center-princess" src="/assets/princess-full-transparent.webp" alt="공주" />
      <header className="relationship-hero">
        <Badge tone="royal">Relationship</Badge>
        <h1>인연록</h1>
        <p>공주가 만난 사람들의 기록입니다. 회사, 연락처, 최근 대화, 관련 프로젝트를 한곳에서 확인합니다.</p>
      </header>

      <div className="relationship-layout">
        <div className="relationship-list">
          {contacts.map((contact) => (
            <button
              key={contact.id}
              type="button"
              className={`relationship-list-item${contact.id === selected?.id ? " active" : ""}`}
              onClick={() => setSelectedId(contact.id)}
            >
              <strong>{contact.name}</strong>
              <span>{stars(contact.affinity)}</span>
            </button>
          ))}
        </div>

        {selected && (
          <div className="relationship-detail">
            <header>
              <h2>{selected.name}</h2>
              <span>{stars(selected.affinity)}</span>
            </header>
            <dl>
              <div><dt>회사</dt><dd>{selected.organization ?? "—"} {selected.position ? `· ${selected.position}` : ""}</dd></div>
              <div><dt>전화</dt><dd>{selected.phone ?? "—"}</dd></div>
              <div><dt>이메일</dt><dd>{selected.email ?? "—"}</dd></div>
              <div><dt>메모</dt><dd>{selected.memo ?? "—"}</dd></div>
              <div><dt>최근 대화</dt><dd>{selected.lastContactAt?.slice(0, 10) ?? "—"}</dd></div>
              <div><dt>최근 미팅</dt><dd>{selected.lastMeetingAt?.slice(0, 10) ?? "—"}</dd></div>
            </dl>

            <h3>관련 프로젝트</h3>
            {selected.relatedMainQuestIds.length === 0 ? (
              <p className="small-copy">관련 프로젝트가 없습니다.</p>
            ) : (
              selected.relatedMainQuestIds.map((id) => <p key={id}>👑 {mainQuestTitle.get(id) ?? id}</p>)
            )}

            {selected.aiSummary && (
              <section className="relationship-ai-summary">
                <h3>AI 최근 3개월 대화 요약</h3>
                <p>{selected.aiSummary}</p>
              </section>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
