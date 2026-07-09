import type { UserProgress } from "../../app/types";
import { Badge } from "../design-system/Badge";

interface HomeTopHudProps {
  timeLabel: string;
  seasonLabel: string;
  progress: UserProgress;
}

export function HomeTopHud({ timeLabel, seasonLabel, progress }: HomeTopHudProps) {
  return (
    <header className="home-top-hud">
      <div>
        <div className="home-kicker">
          <span>{timeLabel}</span>
          <span>{seasonLabel}</span>
          <span>루멘 왕성</span>
        </div>
        <h1>루멘 왕성</h1>
      </div>
      <div className="home-hud-actions">
        <Badge tone="gold">Lv.{progress.level}</Badge>
        <Badge tone="royal">EXP {progress.expRate}%</Badge>
        <Badge tone={progress.pendingRewards > 0 ? "success" : "soft"}>
          Reward {progress.pendingRewards}
        </Badge>
      </div>
    </header>
  );
}
