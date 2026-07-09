import type { PrincessProfile, UserProgress } from "../../app/types";
import { Button } from "../design-system/Button";
import { GlassPanel } from "../design-system/GlassPanel";
import { ProgressBar } from "../design-system/ProgressBar";

interface PrincessPresencePanelProps {
  princess: PrincessProfile;
  progress: UserProgress;
  onOpenProfile: () => void;
}

export function PrincessPresencePanel({
  princess,
  progress,
  onOpenProfile,
}: PrincessPresencePanelProps) {
  return (
    <GlassPanel className="princess-presence-panel">
      <div>
        <span className="panel-label">주인공 · 성장 캐릭터</span>
        <h2>공주님이 오늘의 왕성을 움직입니다.</h2>
        <p>
          {princess.activeTitle}로서 퀘스트를 수행하고 보상을 장착하며, 루멘 왕성의 성장을 이끌어갑니다.
        </p>
        <div className="exp-row">
          <span>EXP</span>
          <ProgressBar value={progress.expRate} label="Princess EXP" />
          <strong>{princess.currentExp.toLocaleString()} / {princess.requiredExp.toLocaleString()}</strong>
        </div>
        <Button onClick={onOpenProfile}>공주 프로필</Button>
      </div>
      <img src="/assets/princess-full.png" alt="공주 전신" />
    </GlassPanel>
  );
}
