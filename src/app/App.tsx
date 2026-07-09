import type { ViewKey } from "./types";
import { usePrincessOsApp } from "./usePrincessOsApp";
import { BottomNav } from "../components/design-system/BottomNav";
import { HomeScene } from "../components/home/HomeScene";
import { ProgressScreen } from "../components/modules/ProgressScreen";
import { QuestScreen } from "../components/modules/QuestScreen";
import { SerinScreen } from "../components/modules/SerinScreen";
import { BedroomPage } from "../features/bedroom/pages/BedroomPage";
import { CalendarPage } from "../features/calendar/pages/CalendarPage";
import { CastleHubPage } from "../features/castle/pages/CastleHubPage";
import { GardenPage } from "../features/garden/pages/GardenPage";
import { LibraryPage } from "../features/library/pages/LibraryPage";
import { PrincessPage } from "../features/princess/pages/PrincessPage";

const websiteNavItems: Array<{ key: ViewKey; label: string }> = [
  { key: "home", label: "로비" },
  { key: "castle", label: "왕궁" },
  { key: "calendar", label: "집무실" },
  { key: "bedroom", label: "침실" },
  { key: "garden", label: "정원" },
  { key: "library", label: "도서관" },
  { key: "progress", label: "왕좌" },
  { key: "serin", label: "세린" },
];

export function App() {
  const app = usePrincessOsApp();

  return (
    <div className="palace-website">
      <header className="website-top-nav">
        <button type="button" className="website-brand" onClick={() => app.setActiveView("home")}>
          <span>♕</span>
          <strong>PRINCESS OS</strong>
        </button>
        <nav aria-label="Princess OS website navigation">
          {websiteNavItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={app.activeView === item.key ? "active" : ""}
              onClick={() => app.setActiveView(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="website-main">
        {app.activeView === "home" && <HomeScene data={app.appData} activeView={app.activeView} onNavigate={app.setActiveView} />}
        {app.activeView === "castle" && (
          <CastleHubPage rooms={app.appData.rooms} activeView={app.activeView} onNavigate={app.setActiveView} />
        )}
        {app.activeView === "library" && (
          <LibraryPage
            quests={app.appData.quests}
            history={app.appData.questHistory}
            events={app.appData.events}
            messages={app.appData.serinMessages}
            memories={app.serinMemories}
          />
        )}
        {app.activeView === "garden" && (
          <GardenPage serin={app.snapshot.serin} onBackToCastle={() => app.setActiveView("castle")} />
        )}
        {app.activeView === "bedroom" && (
          <BedroomPage events={app.appData.events} quests={app.appData.quests} />
        )}
        {app.activeView === "quests" && (
          <QuestScreen
            quests={app.appData.quests}
            history={app.appData.questHistory}
            progress={app.appData.progress}
            completionEvents={app.completionEvents}
            onCompleteQuest={app.completeQuest}
            onCycleQuest={app.cycleQuest}
          />
        )}
        {app.activeView === "calendar" && (
          <CalendarPage
            events={app.appData.events}
            quests={app.appData.quests}
            selectedDate={app.selectedDate}
            onSelectDate={app.setSelectedDate}
            onAskSerin={app.sendSerinMessage}
            onCompleteEvent={app.completeCalendarEvent}
            onCancelEvent={app.cancelCalendarEvent}
          />
        )}
        {app.activeView === "serin" && (
          <SerinScreen
            princess={app.appData.princess}
            serin={app.snapshot.serin}
            messages={app.appData.serinMessages}
            status={app.serinStatus}
            pendingAction={app.pendingSerinAction}
            memories={app.serinMemories}
            onSendMessage={app.sendSerinMessage}
            onConfirmAction={app.confirmSerinAction}
            onCancelAction={app.cancelSerinAction}
            onAttach={app.handleAttach}
          />
        )}
        {app.activeView === "progress" && <ProgressScreen data={app.appData} onOpenProfile={() => app.setActiveView("profile")} />}
        {app.activeView === "profile" && <PrincessPage data={app.appData} />}
      </main>

      <BottomNav activeView={app.activeView} onChange={app.setActiveView} />
    </div>
  );
}
