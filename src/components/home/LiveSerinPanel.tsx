import type { SerinProfile } from "../../app/types";
import { Button } from "../design-system/Button";
import { GlassPanel } from "../design-system/GlassPanel";
import { ProgressBar } from "../design-system/ProgressBar";

interface LiveSerinPanelProps {
  serin: SerinProfile;
  onAskSerin: () => void;
}

export function LiveSerinPanel({ serin, onAskSerin }: LiveSerinPanelProps) {
  return (
    <GlassPanel className="live-serin-panel">
      <div>
        <span className="panel-label">{serin.name} · AI 메이드</span>
        <h2>{serin.greetingTitle}</h2>
        <p>{serin.greetingText}</p>
        <div className="affinity-row">
          <span>{serin.relationshipLabel}</span>
          <ProgressBar value={serin.affinity} label="Serin affinity" />
          <strong>{serin.affinity}%</strong>
        </div>
        <Button variant="glass" onClick={onAskSerin}>세린에게 맡기기</Button>
      </div>
      <img src="/assets/serin-full.png" alt="세린 전신" />
    </GlassPanel>
  );
}
