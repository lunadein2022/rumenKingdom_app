import { Badge } from "../../../components/design-system/Badge";
import { Button } from "../../../components/design-system/Button";
import { calendarCategoryMeta, type CalendarEvent } from "../types/calendar.types";

interface CalendarEventCardProps {
  event: CalendarEvent;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export function CalendarEventCard({ event, onComplete, onCancel }: CalendarEventCardProps) {
  const meta = calendarCategoryMeta[event.category];
  const disabled = event.status !== "scheduled";

  return (
    <article className={`calendar-event-card ${event.status}`}>
      <div className="calendar-event-head">
        <div>
          <Badge tone={meta.tone}>{meta.label}</Badge>
          {event.linkedQuestId && <Badge tone="gold">Quest 연결</Badge>}
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
        <Button variant="glass" size="sm" onClick={() => onCancel(event.id)} disabled={disabled}>
          취소
        </Button>
        <Button size="sm" onClick={() => onComplete(event.id)} disabled={disabled}>
          완료
        </Button>
      </div>
    </article>
  );
}
