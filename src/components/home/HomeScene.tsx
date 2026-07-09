import type { AppMockData, ViewKey } from "../../app/types";
import type { CastleRoom, CastleRoomKey } from "../../features/castle/types/castle.types";
import { getEventsByDay } from "../../features/calendar/services/calendarService";
import { HomeHud } from "./HomeHud";
import { HomeLeftRail } from "./HomeLeftRail";
import { HomeRightRail } from "./HomeRightRail";

interface HomeSceneProps {
  data: AppMockData;
  rooms: CastleRoom[];
  currentRoomKey: CastleRoomKey;
  onNavigate: (view: ViewKey) => void;
  onCompleteQuest: (id: string) => void;
}

const TODAY = "2026-07-09";

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "공주님, 좋은 아침이에요. 오늘도 함께 힘내요!";
  if (hour < 18) return "공주님, 좋은 오후예요. 오늘도 함께 힘내요!";
  return "공주님, 오늘 하루도 정말 수고하셨어요.";
}

// Home = 왕궁 로비. 화면의 주인공은 배경(Scene)이고, UI는 그 위에 떠 있는
// Glass Overlay입니다. 카드로 화면을 가리지 않습니다. 공주와 세린은 항상
// Scene 안에 존재합니다. Home 자체에는 기능을 직접 담지 않고, 최소 브리핑과
// Castle 이동만 제공합니다.
export function HomeScene({ data, rooms, currentRoomKey, onNavigate, onCompleteQuest }: HomeSceneProps) {
  const todayEvents = getEventsByDay(data.events, TODAY).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const todayQuests = data.quests.filter((quest) => quest.dueDate === TODAY);
  const alertCount = todayEvents.filter((event) => Boolean(event.reminderMinutes)).length;
  const activeMainQuests = data.mainQuests.filter((mainQuest) => mainQuest.status === "active");
  const gold = 107515;
  const gems = 1196;

  return (
    <section className="palace-hud-scene">
      <div className="palace-hud-backdrop" style={{ backgroundImage: 'url("/assets/home-bg.webp")' }} />

      <HomeHud princess={data.princess} progress={data.progress} gold={gold} gems={gems} mailCount={data.serinMessages.length > 0 ? 2 : 0} />

      <div className="palace-hud-figures">
        <img src="/assets/princess-full-transparent.webp" alt="공주" />
        <img src="/assets/serin-full-transparent.webp" alt="세린" />
      </div>

      <HomeLeftRail
        greetingLine={timeGreeting()}
        todayEventCount={todayEvents.length}
        todayQuestCount={todayQuests.length}
        alertCount={alertCount}
        memoCount={data.serinMessages.filter((message) => message.sender === "serin").length}
        todayEvents={todayEvents}
        todayQuests={todayQuests}
        onNavigate={onNavigate}
        onCompleteQuest={onCompleteQuest}
      />

      <HomeRightRail
        rooms={rooms}
        currentRoomKey={currentRoomKey}
        activeMainQuests={activeMainQuests}
        onNavigate={onNavigate}
      />

      <button type="button" className="home-castle-enter" onClick={() => onNavigate("castle")}>
        왕성으로 이동 →
      </button>
    </section>
  );
}
