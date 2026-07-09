import type { Achievement } from "../../app/types";
import { Badge } from "../design-system/Badge";
import { Card } from "../design-system/Card";

interface AchievementPreviewProps {
  achievements: Achievement[];
}

export function AchievementPreview({ achievements }: AchievementPreviewProps) {
  const unlocked = achievements.filter((achievement) => achievement.unlocked).length;

  return (
    <Card className="preview-card">
      <Badge tone="gold">Achievement</Badge>
      <strong>{unlocked}/{achievements.length}</strong>
      <span>해금된 업적</span>
    </Card>
  );
}
