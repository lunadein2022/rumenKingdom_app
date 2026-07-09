import type { ViewKey } from "./types";
import { usePrincessOsApp } from "./usePrincessOsApp";
import { BottomNav, primaryNavItems } from "../components/design-system/BottomNav";
import { HomeScene } from "../components/home/HomeScene";
import { ProgressScreen } from "../components/modules/ProgressScreen";
import { QuestScreen } from "../components/modules/QuestScreen";
import { SerinScreen } from "../components/modules/SerinScreen";
import { CalendarPage } from "../features/calendar/pages/CalendarPage";
import { GardenPage } from "../features/garden/pages/GardenPage";
import { LibraryPage } from "../features/library/pages/LibraryPage";
import { PrincessPage } from "../features/princess/pages/PrincessPage";

const desktopNavItems = [
  ...primaryNavItems,
  { key: "garden" as ViewKey, label: "정원", icon: "✧" },
  { key: "progress" as ViewKey, label: "성장", icon: "▲" },
  { key: "profile" as ViewKey, label: "공주", icon: "♛" },
];

export function App() {
  const app = usePrincessOsApp();

  return (
    <div className="personal-os-shell">
      <header className="personal-os-topbar">
        <div>
          <span>Princess OS Alpha</span>
          <strong>루멘 왕국 개인 운영체제</strong>
        </div>
        <small>Live Palace · Serin Assisted</small>
      </header>

      <aside className="personal-os-sidebar" aria-label="Princess OS desktop navigation">
        {desktopNavItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={app.activeView === item.key ? "active" : ""}
            onClick={() => app.setActiveView(item.key)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </aside>

      <main className="personal-os-main">
        {app.activeView === "home" && <HomeScene data={app.appData} activeView={app.activeView} onNavigate={app.setActiveView} />}
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
          <GardenPage serin={app.snapshot.serin} onBackToCastle={() => app.setActiveView("home")} />
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
