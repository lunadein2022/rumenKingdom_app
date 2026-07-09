import type { UserProgress } from "../../app/types";
import { Badge } from "../design-system/Badge";
import { Card } from "../design-system/Card";
import { ProgressBar } from "../design-system/ProgressBar";

interface ProgressSummaryProps {
  progress: UserProgress;
}

export function ProgressSummary({ progress }: ProgressSummaryProps) {
  return (
    <Card className="preview-card">
      <Badge tone="gold">Progress</Badge>
      <strong>Lv.{progress.level}</strong>
      <ProgressBar value={progress.expRate} label="Progress summary EXP" />
    </Card>
  );
}
