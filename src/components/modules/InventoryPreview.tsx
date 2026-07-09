import type { InventoryItem } from "../../app/types";
import { Badge } from "../design-system/Badge";
import { Card } from "../design-system/Card";

interface InventoryPreviewProps {
  inventory: InventoryItem[];
}

export function InventoryPreview({ inventory }: InventoryPreviewProps) {
  const equipped = inventory.filter((item) => item.equipped).length;

  return (
    <Card className="preview-card">
      <Badge tone="royal">Inventory</Badge>
      <strong>{equipped}/{inventory.length}</strong>
      <span>착용 아이템</span>
    </Card>
  );
}
