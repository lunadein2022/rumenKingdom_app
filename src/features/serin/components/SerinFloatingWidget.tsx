import { useState } from "react";
import type { SerinMessage } from "../../../app/types";
import type { SerinStatus } from "../types/serin.types";

interface SerinFloatingWidgetProps {
  lastMessage?: SerinMessage;
  status: SerinStatus;
  hasPendingAction: boolean;
  onOpenSerin: () => void;
}

const statusLabel: Record<SerinStatus, string> = {
  idle: "대기 중",
  thinking: "생각하는 중…",
  speaking: "말하는 중",
  error: "잠시 흐트러짐",
};

// 세린은 Serin 화면에만 있는 존재가 아니라, 왕궁 전체를 돌아다니는 메이드봇입니다.
// 이 위젯은 Serin 화면이 아닌 모든 화면 우측 하단에 떠 있고, 평소에는 작은
// 아바타로 최소화되어 있다가 눌렀을 때만 최근 대화 미리보기가 펼쳐집니다.
// 실제 대화는 항상 Serin 화면(왕궁 응접실)에서 이어집니다 — 이 위젯은 그
// 화면으로 안내하는 역할만 합니다.
export function SerinFloatingWidget({ lastMessage, status, hasPendingAction, onOpenSerin }: SerinFloatingWidgetProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="serin-maidbot">
      {expanded && (
        <div className="serin-maidbot-popover">
          <div className="serin-maidbot-popover-head">
            <strong>세린</strong>
            <button type="button" aria-label="최소화" onClick={() => setExpanded(false)}>×</button>
          </div>
          <p>{lastMessage?.content ?? "공주님, 필요하신 게 있으면 언제든 불러주세요."}</p>
          <button type="button" className="serin-maidbot-open" onClick={onOpenSerin}>
            세린과 대화하기 →
          </button>
        </div>
      )}

      <button
        type="button"
        className={`serin-maidbot-avatar ${status}`}
        aria-label="세린 열기"
        onClick={() => setExpanded((value) => !value)}
      >
        <img src="/assets/serin-bust-transparent.webp" alt="세린" />
        {hasPendingAction && <em className="serin-maidbot-badge" />}
        <span className="serin-maidbot-status-dot" title={statusLabel[status]} />
      </button>
    </div>
  );
}
