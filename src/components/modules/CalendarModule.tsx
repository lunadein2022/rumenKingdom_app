import type { AppMockData } from "../../app/types";
import { Badge } from "../design-system/Badge";
import { Card } from "../design-system/Card";

interface CalendarModuleProps {
  data: AppMockData;
}

export function CalendarModule({ data }: CalendarModuleProps) {
  return (
    <section className="module-stack">
      <Card>
        <div className="module-heading">
          <div>
            <h2>왕실 캘린더</h2>
            <p>일정은 궁전의 방과 연결됩니다. Supabase에서는 calendar_events로 분리됩니다.</p>
          </div>
          <Badge tone="royal">{data.events.length}개</Badge>
        </div>
      </Card>
      {data.events.map((event) => (
        <Card key={event.id} className="list-card">
          <div>
            <Badge tone="soft">{event.roomKey}</Badge>
            <h3>{event.title}</h3>
            <p>{event.eventDate}</p>
          </div>
        </Card>
      ))}
    </section>
  );
}
