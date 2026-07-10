import { useEffect, useState } from "react";
import type { PrincessProfile, UserProgress } from "../../app/types";
import { formatHudDate, getKoreanTimeNow, getKoreanToday } from "../../app/dateUtils";

interface GameTopHudProps {
  princess: PrincessProfile;
  progress: UserProgress;
  onSignOut?: () => void;
}

export function GameTopHud({ princess, progress, onSignOut }: GameTopHudProps) {
  const [now, setNow] = useState(getKoreanTimeNow());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(getKoreanTimeNow()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <header className="palace-top-hud">
      <div className="palace-brand">
        <img className="palace-logo-mark" src="/assets/lumen-princess-logo.png" alt="루멘왕국 공주의 하루" />
        <div>
          <strong>PRINCESS OS</strong>
          <small>{princess.activeTitle}</small>
        </div>
      </div>

      <div className="palace-clock">
        <span>{formatHudDate(getKoreanToday())}</span>
        <i />
        <strong>{now}</strong>
        <em>☾</em>
      </div>

      <div className="palace-level">
        <span>♕ Lv.{progress.level} Princess</span>
        <div className="palace-exp">
          <small>EXP {progress.currentExp.toLocaleString()} / {progress.requiredExp.toLocaleString()}</small>
          <b><i style={{ width: `${progress.expRate}%` }} /></b>
        </div>
        <strong>{princess.displayName}</strong>
        {onSignOut && (
          <button type="button" onClick={onSignOut} title="로그아웃" aria-label="로그아웃">
            나가기
          </button>
        )}
      </div>
    </header>
  );
}
