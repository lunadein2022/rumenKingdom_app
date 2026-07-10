import { useState } from "react";
import { Badge } from "../../../components/design-system/Badge";
import { Button } from "../../../components/design-system/Button";
import { calendarCategoryMeta, type CalendarEvent, type CalendarEventInput } from "../types/calendar.types";

interface CalendarEventCardProps {
  event: CalendarEvent;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  onUpdate: (id: string, input: Partial<CalendarEventInput>) => void;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export function CalendarEventCard({ event, onComplete, onCancel, onUpdate }: CalendarEventCardProps) {
  const meta = calendarCategoryMeta[event.category];
  const disabled = event.status !== "scheduled";
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description);
  const [startAt, setStartAt] = useState(event.startAt.slice(0, 16));

  function saveEdit() {
    if (!title.trim()) return;
    onUpdate(event.id, {
      title: title.trim(),
      description,
      startAt: `${startAt}:00`,
    });
    setEditing(false);
  }

  if (editing) {
    return (
      <article className={`calendar-event-card ${event.status}`}>
        <div className="inline-edit-stack">
          <input value={title} onChange={(item) => setTitle(item.target.value)} />
          <textarea value={description} onChange={(item) => setDescription(item.target.value)} />
          <input type="datetime-local" value={startAt} onChange={(item) => setStartAt(item.target.value)} />
          <div className="calendar-event-actions">
            <Button variant="glass" size="sm" onClick={() => setEditing(false)}>취소</Button>
            <Button size="sm" onClick={saveEdit}>저장</Button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={`calendar-event-card ${event.status}`}>
      <div className="calendar-event-head">
        <div>
          <Badge tone={meta.tone}>{meta.label}</Badge>
          {event.linkedQuestId && <Badge tone="gold">Quest 연결</Badge>}
          {event.status === "completed" && <Badge tone="success">완료</Badge>}
          {event.status === "cancelled" && <Badge tone="soft">취소됨</Badge>}
        </div>
        <strong>{event.isAllDay ? "하루 종일" : formatTime(event.startAt)}</strong>
      </div>
      <h3>{event.title}</h3>
      <p>{event.description || "공주님의 하루에 기록된 일정입니다."}</p>
      <div className="calendar-event-meta">
        <span>{event.location || "장소 미정"}</span>
        <span>{event.reminderMinutes ? `${event.reminderMinutes}분 전 알림` : "알림 없음"}</span>
      </div>
      <div className="calendar-event-actions">
        <Button variant="glass" size="sm" onClick={() => setEditing(true)} disabled={event.status === "cancelled"}>
          수정
        </Button>
        <Button variant="glass" size="sm" onClick={() => onCancel(event.id)} disabled={disabled}>
          삭제
        </Button>
        <Button size="sm" onClick={() => onComplete(event.id)} disabled={disabled}>
          완료
        </Button>
      </div>
    </article>
  );
}
