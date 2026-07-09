import type { SerinStatus } from "../types/serin.types";

interface SerinStatusOrbProps {
  status: SerinStatus;
}

const statusLabel: Record<SerinStatus, string> = {
  idle: "대기 중",
  thinking: "분석 중",
  speaking: "응답 중",
  error: "처리 실패",
};

export function SerinStatusOrb({ status }: SerinStatusOrbProps) {
  return (
    <div className={`serin-status-orb ${status}`}>
      <span />
      <strong>{statusLabel[status]}</strong>
    </div>
  );
}
