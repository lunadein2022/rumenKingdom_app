import type { CalendarEvent, MainQuest, RelationshipContact } from "../../../app/types";

interface SerinRecentPanelProps {
  mainQuests: MainQuest[];
  events: CalendarEvent[];
  contacts: RelationshipContact[];
}

// Serin이 "OS 전체를 대신 운영하는 비서"라는 감각을 주기 위해, 왼쪽 레일에
// 최근 프로젝트/일정/인연을 짧게 보여줍니다. 대화 중 "그 프로젝트", "그 일정"
// 같은 지시어를 쓸 때 참고할 수 있는 맥락이기도 합니다.
export function SerinRecentPanel({ mainQuests, events, contacts }: SerinRecentPanelProps) {
  const recentProjects = mainQuests.slice(0, 3);
  const recentEvents = events.slice(0, 3);
  const recentContacts = contacts.slice(0, 3);

  return (
    <section className="serin-recent-panel">
      <div>
        <h3>최근 프로젝트</h3>
        {recentProjects.length === 0 ? (
          <p className="small-copy">등록된 프로젝트가 없습니다.</p>
        ) : (
          <ul>
            {recentProjects.map((mq) => (
              <li key={mq.id}>{mq.title}</li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3>최근 일정</h3>
        {recentEvents.length === 0 ? (
          <p className="small-copy">등록된 일정이 없습니다.</p>
        ) : (
          <ul>
            {recentEvents.map((event) => (
              <li key={event.id}>{event.title}</li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3>최근 인연</h3>
        {recentContacts.length === 0 ? (
          <p className="small-copy">등록된 인연이 없습니다.</p>
        ) : (
          <ul>
            {recentContacts.map((contact) => (
              <li key={contact.id}>{contact.name}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
