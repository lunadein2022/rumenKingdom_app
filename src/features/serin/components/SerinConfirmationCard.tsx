import { Badge } from "../../../components/design-system/Badge";
import { Button } from "../../../components/design-system/Button";
import type { SerinAction } from "../types/serin.types";

interface SerinConfirmationCardProps {
  action: SerinAction;
  onConfirm: (secondary?: boolean) => void;
  onCancel: () => void;
}

export function SerinConfirmationCard({ action, onConfirm, onCancel }: SerinConfirmationCardProps) {
  return (
    <section className="serin-confirmation-card">
      <Badge tone="royal">Confirmation</Badge>
      <h2>{action.title}</h2>
      <p>{action.summary}</p>
      <div>
        <Button size="sm" onClick={() => onConfirm(false)}>{action.confirmLabel}</Button>
        {action.secondaryLabel && (
          <Button size="sm" variant="glass" onClick={() => onConfirm(true)}>{action.secondaryLabel}</Button>
        )}
        <Button size="sm" variant="ghost" onClick={onCancel}>취소</Button>
      </div>
    </section>
  );
}
