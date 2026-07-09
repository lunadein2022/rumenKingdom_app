import type { AppMockData, ViewKey } from "../../app/types";
import { getEventsByDay, getUpcomingEvents } from "../../features/calendar/services/calendarService";

interface HomeSceneProps {
  data: AppMockData;
  onNavigate: (view: ViewKey) => void;
}

const TODAY = "2026-07-09";

function timeContext() {
  const hour = new Date().getHours();
  if (hour < 11) {
    return { label: "아침", line: "공주님, 오늘도 좋은 아침입니다. 왕성으로 들어가실까요?" };
  }
  if (hour < 18) {
    return { label: "낮", line: "공주님, 오늘 일정이 잘 진행되고 있습니다. 왕성으로 들어가실까요?" };
  }
  return { label: "밤", line: "공주님, 오늘 하루도 정말 수고하셨습니다. 왕성으로 들어가실까요?" };
}

// Home은 왕궁 로비입니다. Castle(방 이동 허브)과는 분리된, 하루를 시작하는 자리이므로
// 최소한만 남깁니다: 공주+세린, 오늘 브리핑, 오늘 일정/Quest 최소 카운트, Castle 이동뿐입니다.
export function HomeScene({ data, onNavigate }: HomeSceneProps) {
  const time = timeContext();
  const todayEvents = getEventsByDay(data.events, TODAY);
  const nextEvent = getUpcomingEvents(data.events)[0];
  const speechLine = nextEvent
    ? `세린이 ${nextEvent.startAt.slice(11, 16)} ${nextEvent.title} 일정을 준비하고 있습니다.`
    : time.line;

  return (
    <section className="palace-lobby-simple">
      <div className="palace-lobby-simple-scene" style={{ backgroundImage: 'url("/assets/home-bg.webp")' }}>
        <div className="palace-lobby-simple-figures">
          <img src="/assets/princess-full-transparent.webp" alt="공주" />
          <img src="/assets/serin-full-transparent.webp" alt="세린" />
        </div>
        <div className="palace-lobby-simple-bubble">
          <span>{time.label}</span>
          <p>{speechLine}</p>
        </div>
      </div>

      <div className="palace-lobby-simple-strip">
        <div className="lobby-mini-count">
          <strong>{todayEvents.length}</strong>
          <span>오늘 일정</span>
        </div>
        <div className="lobby-mini-count">
          <strong>
            {data.progress.todayCompletedQuests}/{data.progress.todayTotalQuests}
          </strong>
          <span>오늘 Quest</span>
        </div>
        <button type="button" className="lobby-enter-castle" onClick={() => onNavigate("castle")}>
          왕성으로 이동 →
        </button>
      </div>
    </section>
  );
}
