import { useMemo, useState } from "react";
import type { ViewKey } from "./types";
import { getPrincessOsSnapshot } from "../data/mockRepository";
import { BottomNav } from "../components/design-system/BottomNav";
import { TopAppBar } from "../components/design-system/TopAppBar";
import { HomeScene } from "../components/home/HomeScene";
import { CalendarModule } from "../components/modules/CalendarModule";
import { PrincessCharacter } from "../components/modules/PrincessCharacter";
import { QuestModule } from "../components/modules/QuestModule";
import { SystemModule } from "../components/modules/SystemModule";

export function App() {
  const [activeView, setActiveView] = useState<ViewKey>("home");
  const data = useMemo(() => getPrincessOsSnapshot(), []);

  return (
    <div className="app-shell">
      <TopAppBar
        timeLabel="좋은 아침입니다"
        seasonLabel="여름"
        level={data.princess.level}
        pendingRewards={data.progress.pendingRewards}
      />

      <main>
        {activeView === "home" && (
          <HomeScene data={data} activeView={activeView} onNavigate={setActiveView} />
        )}
        {activeView === "quests" && <QuestModule data={data} />}
        {activeView === "calendar" && <CalendarModule data={data} />}
        {activeView === "profile" && <PrincessCharacter data={data} />}
        {activeView === "castle" && <SystemModule data={data} view="castle" />}
        {activeView === "achievements" && <SystemModule data={data} view="achievements" />}
        {activeView === "inventory" && <SystemModule data={data} view="inventory" />}
        {activeView === "serin" && <SystemModule data={data} view="serin" />}
      </main>

      {activeView !== "home" && <BottomNav activeView={activeView} onChange={setActiveView} />}
    </div>
  );
}
