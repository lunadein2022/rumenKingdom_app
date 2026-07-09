import type { AppMockData, ViewKey } from "../../app/types";
import { Badge } from "../design-system/Badge";
import { GlassPanel } from "../design-system/GlassPanel";
import { CrystalDock } from "./CrystalDock";
import { HomeTopHud } from "./HomeTopHud";
import { LiveSerinPanel } from "./LiveSerinPanel";
import { PalaceRoomSection } from "./PalaceRoomSection";
import { PrincessPresencePanel } from "./PrincessPresencePanel";

interface HomeSceneProps {
  data: AppMockData;
  activeView: ViewKey;
  onNavigate: (view: ViewKey) => void;
}

export function HomeScene({ data, activeView, onNavigate }: HomeSceneProps) {
  return (
    <section className="home-scene">
      <div className="home-ambient" />

      <HomeTopHud timeLabel="좋은 아침입니다" seasonLabel="여름" progress={data.progress} />

      <section className="home-hero">
        <PrincessPresencePanel
          princess={data.princess}
          progress={data.progress}
          onOpenProfile={() => onNavigate("profile")}
        />
        <LiveSerinPanel serin={data.serin} onAskSerin={() => onNavigate("serin")} />
      </section>

      <GlassPanel className="home-summary-grid">
        <div>
          <Badge tone="royal">오늘 퀘스트</Badge>
          <strong>{data.progress.todayCompletedQuests}/{data.progress.todayTotalQuests}</strong>
          <span>dueDate가 오늘인 퀘스트 기준</span>
        </div>
        <div>
          <Badge tone="royal">오늘 일정</Badge>
          <strong>{data.events.length}</strong>
          <span>왕실 캘린더 일정</span>
        </div>
        <div>
          <Badge tone="gold">Princess Level</Badge>
          <strong>Lv.{data.progress.level}</strong>
          <span>{data.progress.expRate}% EXP</span>
        </div>
        <div>
          <Badge tone="success">Streak</Badge>
          <strong>{data.progress.streakDays}일</strong>
          <span>하루 1개 이상 완료한 날짜 연속</span>
        </div>
      </GlassPanel>

      <section className="system-entry-grid" aria-label="Growth systems">
        {[
          { view: "profile" as ViewKey, label: "Princess", value: data.princess.activeTitle },
          { view: "castle" as ViewKey, label: "Castle", value: `${data.rooms.length} rooms` },
          { view: "achievements" as ViewKey, label: "Achievement", value: `${data.achievements.length} records` },
          { view: "inventory" as ViewKey, label: "Inventory", value: `${data.inventory.length} items` },
        ].map((entry) => (
          <button type="button" key={entry.view} onClick={() => onNavigate(entry.view)}>
            <span>{entry.label}</span>
            <strong>{entry.value}</strong>
          </button>
        ))}
      </section>

      <PalaceRoomSection rooms={data.rooms} onNavigate={onNavigate} />
      <CrystalDock activeView={activeView} onNavigate={onNavigate} />
    </section>
  );
}
