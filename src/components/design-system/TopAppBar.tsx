import { Badge } from "./Badge";

interface TopAppBarProps {
  timeLabel: string;
  seasonLabel: string;
  level: number;
  pendingRewards: number;
}

export function TopAppBar({ timeLabel, seasonLabel, level, pendingRewards }: TopAppBarProps) {
  return (
    <header className="top-app-bar">
      <div>
        <div className="top-kicker">
          <span>{timeLabel}</span>
          <span>{seasonLabel}</span>
          <span>루멘 왕성</span>
        </div>
        <h1>Princess OS</h1>
      </div>
      <div className="top-actions">
        <Badge tone="gold">Lv.{level}</Badge>
        <Badge tone={pendingRewards > 0 ? "success" : "soft"}>Reward {pendingRewards}</Badge>
      </div>
    </header>
  );
}
