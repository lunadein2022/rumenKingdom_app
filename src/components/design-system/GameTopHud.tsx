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
    <header className="palace-top-hud palace-top-banner" aria-label="루멘왕국 공주의 하루 상단 배너">
      <img className="palace-top-banner-image" src="/assets/lumen-top-banner.png" alt="루멘왕국 공주의 하루" />
      <time className="palace-top-banner-time" dateTime={now}>{now}</time>
    </header>
  );
}
