import type { AppMockData, ViewKey } from "../../app/types";
import type { CastleRoom, CastleRoomKey } from "../../features/castle/types/castle.types";
import { getEventsByDay } from "../../features/calendar/services/calendarService";
import { getKoreanToday } from "../../app/dateUtils";

interface HomeSceneProps {
  data: AppMockData;
  rooms: CastleRoom[];
  currentRoomKey: CastleRoomKey;
  onNavigate: (view: ViewKey) => void;
  onToggleQuest: (id: string, completed: boolean) => void;
}

const TODAY = getKoreanToday();

function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "좋은 아침이에요, 공주님.";
  if (hour < 18) return "오늘도 루멘을 빛내는 하루가 될 거예요.";
  return "좋은 저녁이에요, 공주님. 오늘도 정말 수고하셨어요.";
}

export function HomeScene({ data, rooms, onNavigate, onToggleQuest }: HomeSceneProps) {
  const todayEvents = getEventsByDay(data.events, TODAY).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const todayQuests = data.quests.filter((quest) => quest.dueDate === TODAY);
  const activeMainQuests = data.mainQuests.filter((mainQuest) => mainQuest.status === "active").slice(0, 3);
  const visibleQuests = todayQuests.slice(0, 4);
  const privateRooms = rooms.filter((room) => room.route === "bedroom" || room.route === "garden" || room.route === "throne");

  return (
    <section className="palace-scene palace-lobby scene-fullbleed">
      <div className="palace-bg" style={{ backgroundImage: 'url("/assets/home-bg.webp")' }} />
      <div className="palace-vignette" />

      <div className="lobby-characters" aria-hidden="true">
        <img className="lobby-princess" src="/assets/princess-full-final.png" alt="" />
      </div>

      <aside className="palace-panel lobby-left brief-panel">
        <span className="panel-eyebrow">♕ 오늘 브리핑</span>
        <h1>{greeting()}</h1>
        <p>오늘도 공주님의 왕국을 차분히 정리해둘게요.</p>
        <div className="brief-stats">
          <article><span>오늘 일정</span><strong>{todayEvents.length}건</strong></article>
          <article><span>오늘 Quest</span><strong>{todayQuests.length}개</strong></article>
          <article><span>진행 프로젝트</span><strong>{activeMainQuests.length}개</strong></article>
          <article><span>왕궁 기록</span><strong>{data.diaryEntries.length}개</strong></article>
        </div>
        <section className="mini-list">
          <div className="mini-list-head">
            <h2>오늘의 일정</h2>
            <button type="button" onClick={() => onNavigate("calendar")}>전체 보기</button>
          </div>
          {todayEvents.slice(0, 5).map((event) => (
            <p key={event.id}><time>{event.isAllDay ? "종일" : event.startAt.slice(11, 16)}</time><span>{event.title}</span><em>{event.location ?? "왕성"}</em></p>
          ))}
          {todayEvents.length === 0 && <p className="empty-line">이 시간의 왕실 일정은 아직 비어 있어요.</p>}
        </section>
      </aside>

      <aside className="palace-panel lobby-left quest-panel">
        <div className="mini-list-head">
          <h2>오늘의 Quest</h2>
          <button type="button" onClick={() => onNavigate("office")}>전체 보기</button>
        </div>
        {visibleQuests.map((quest) => (
          <label key={quest.id} className="quest-check-line">
            <input
              type="checkbox"
              checked={quest.status === "completed"}
              onChange={(event) => onToggleQuest(quest.id, event.target.checked)}
            />
            <span>[{quest.type === "daily" ? "일일" : "서브"}] {quest.title}</span>
          </label>
        ))}
        {visibleQuests.length === 0 && <p className="empty-line">오늘의 Quest는 아직 정해지지 않았어요.</p>}
      </aside>

      <aside className="palace-panel lobby-right room-entry-panel">
        <div className="mini-list-head">
          <h2>왕궁 안쪽으로 이동</h2>
          <button type="button" onClick={() => onNavigate("castle")}>전체 지도</button>
        </div>
        <div className="room-entry-grid">
          {privateRooms.map((room) => (
            <button key={room.key} type="button" onClick={() => onNavigate(room.route)}>
              <strong>{room.name}</strong>
              <span>{room.subtitle}</span>
            </button>
          ))}
        </div>
      </aside>
    </section>
  );
}

