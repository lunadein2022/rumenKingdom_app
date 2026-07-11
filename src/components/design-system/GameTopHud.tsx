import { useEffect, useState } from "react";
import type { PrincessProfile, UserProgress } from "../../app/types";
import { getKoreanTimeNow } from "../../app/dateUtils";

interface GameTopHudProps {
  princess: PrincessProfile;
  progress: UserProgress;
  onSignOut?: () => void;
}

export function GameTopHud(_props: GameTopHudProps) {
  const [now, setNow] = useState(getKoreanTimeNow());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(getKoreanTimeNow()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <header className="top-bar palace-top-hud" aria-label="루멘왕국 공주의 하루 상단바">
      <div className="top-overlay-inner">
        <img className="top-bar-image" src="/assets/top-bar.png" alt="Princess OS" />
      </div>
      <time className="top-bar-time" dateTime={now}>{now}</time>
    </header>
  );
}
