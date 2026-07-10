import { useEffect, useState } from "react";
import type { PrincessProfile, UserProgress } from "../../app/types";
import { formatHudDate, getKoreanTimeNow, getKoreanToday } from "../../app/dateUtils";

interface GameTopHudProps {
  princess: PrincessProfile;
  progress: UserProgress;
}

// 모든 화면 위에 떠 있는 게임식 상단 HUD입니다. 문장(크레스트) / 오늘 날짜 /
// 현재 시각 / 레벨·EXP만 보여줍니다. 재화(골드/보석)나 우편함처럼 아직 실제
// 시스템이 없는 지표는 표시하지 않습니다. 날씨는 API 연동 전까지 숨깁니다.
export function GameTopHud({ princess, progress }: GameTopHudProps) {
  const [now, setNow] = useState(getKoreanTimeNow());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(getKoreanTimeNow()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <header className="game-topbar">
      <div className="game-topbar-brand">
        <span className="game-topbar-crest">♛</span>
        <span>PRINCESS OS</span>
      </div>

      <div className="game-topbar-clock">
        <span className="game-topbar-date">{formatHudDate(getKoreanToday())}</span>
        <strong className="game-topbar-time">{now}</strong>
      </div>

      <div className="game-topbar-level">
        <span className="game-topbar-level-badge">Lv.{progress.level}</span>
        <div className="game-topbar-level-copy">
          <span>{princess.activeTitle}</span>
          <div className="game-topbar-exp-track">
            <div className="game-topbar-exp-fill" style={{ width: `${progress.expRate}%` }} />
          </div>
        </div>
        <em className="game-topbar-exp-label">EXP {progress.expRate}%</em>
      </div>
    </header>
  );
}
