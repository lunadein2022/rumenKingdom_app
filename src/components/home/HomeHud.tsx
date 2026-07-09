import type { PrincessProfile, UserProgress } from "../../app/types";

interface HomeHudProps {
  princess: PrincessProfile;
  progress: UserProgress;
  gold: number;
  gems: number;
  mailCount: number;
}

// 화면 최상단에 얇게 떠 있는 Glass HUD 바입니다. 큰 흰 카드가 아니라 반투명
// 오버레이로, 레벨/EXP/재화/우편함만 간결하게 보여줍니다.
export function HomeHud({ princess, progress, gold, gems, mailCount }: HomeHudProps) {
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

      <div className="home-hud-currency">
        <span>💎 {gems.toLocaleString()}</span>
        <span>🪙 {gold.toLocaleString()}</span>
      </div>

      <div className="home-hud-icons">
        <button type="button" aria-label="우편함">
          ✉️{mailCount > 0 && <em>{mailCount}</em>}
        </button>
        <button type="button" aria-label="설정">⚙️</button>
      </div>
    </header>
  );
}
