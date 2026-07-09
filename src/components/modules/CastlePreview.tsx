import type { PalaceRoom } from "../../app/types";
import { Badge } from "../design-system/Badge";
import { Card } from "../design-system/Card";

interface CastlePreviewProps {
  rooms: PalaceRoom[];
}

export function CastlePreview({ rooms }: CastlePreviewProps) {
  return (
    <Card className="preview-card">
      <Badge tone="royal">Castle</Badge>
      <strong>{rooms.length} rooms</strong>
      <span>루멘 왕성 성장 상태</span>
    </Card>
  );
}
