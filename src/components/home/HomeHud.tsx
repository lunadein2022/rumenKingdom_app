import type { PrincessProfile, UserProgress } from "../../app/types";

interface HomeHudProps {
  princess: PrincessProfile;
  progress: UserProgress;
  todayEventCount: number;
  todayQuestCount: number;
  activeMainQuestCount: number;
  memoCount: number;
}

// 화면 최상단에 얇게 떠 있는 Glass HUD 바입니다. Princess OS에는 재화(보석/코인)
// 시스템이 없으므로, 실제로 존재하는 지표(레벨/EXP/오늘 일정·Quest/진행 중
// 메인Quest/세린 메모)만 간결하게 보여줍니다.
export function HomeHud({ princess, progress, todayEventCount, todayQuestCount, activeMainQuestCount, memoCount }: HomeHudProps) {
  return (
    <header className="home-hud-bar">
      <div className="home-hud-brand">
        <span className="home-hud-crest">♛</span>
        <span>PRINCESS OS</span>
      </div>

      <div className="home-hud-level">
        <span className="home-hud-level-badge">Lv.{progress.level} {princess.displayName}</span>
        <div className="home-hud-exp-track">
          <div className="home-hud-exp-fill" style={{ width: `${progress.expRate}%` }} />
        </div>
        <span className="home-hud-exp-label">{progress.expRate}%</span>
      </div>

      <div className="home-hud-stats">
        <span title="오늘 일정">📅 {todayEventCount}</span>
        <span title="오늘 Quest">✅ {todayQuestCount}</span>
        <span title="진행 중 메인 Quest">📁 {activeMainQuestCount}</span>
        <span title="세린 메모">🧠 {memoCount}</span>
      </div>
    </header>
  );
}
