import type { Quest } from "../../app/types";
import { Badge } from "../design-system/Badge";
import { Card } from "../design-system/Card";

interface QuestPreviewProps {
  quests: Quest[];
}

export function QuestPreview({ quests }: QuestPreviewProps) {
  return (
    <Card className="preview-card">
      <Badge tone="royal">Quest</Badge>
      <strong>{quests.length}개</strong>
      <span>오늘 수행할 왕실 퀘스트</span>
    </Card>
  );
}
