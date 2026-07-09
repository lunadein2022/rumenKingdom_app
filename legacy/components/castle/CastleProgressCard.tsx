import { ProgressBar } from "../../../components/design-system/ProgressBar";
import type { CastleState } from "../types/castle.types";

interface CastleProgressCardProps {
  state: CastleState;
}

export function CastleProgressCard({ state }: CastleProgressCardProps) {
  const rate = Math.round((state.castleExp / state.requiredExp) * 100);

  return (
    <section className="castle-progress-card">
      <div>
        <strong>Castle Lv.{state.castleLevel}</strong>
        <span>{state.castleExp} / {state.requiredExp} Castle EXP</span>
      </div>
      <ProgressBar value={rate} label="Castle EXP" />
      <small>{state.season} · {state.timeOfDay} · {state.castleTheme}</small>
    </section>
  );
}
