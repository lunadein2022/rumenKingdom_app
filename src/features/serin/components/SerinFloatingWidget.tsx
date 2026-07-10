import { useState } from "react";
import type { SerinStatus } from "../types/serin.types";

interface SerinFloatingWidgetProps {
  status: SerinStatus;
  hasPendingAction: boolean;
  onOpenSerin: () => void;
  // 제안 문장을 눌렀을 때: 세린 화면으로 이동하면서 그 질문을 바로 전달합니다.
  // (조회성 질문만 두므로 데이터가 변경되는 액션은 아닙니다.)
  onQuickAsk: (sentence: string) => void;
}

const statusLabel: Record<SerinStatus, string> = {
  idle: "대기 중",
  thinking: "생각하는 중…",
  speaking: "말하는 중",
  error: "잠시 흐트러짐",
};

const quickSuggestions = ["오늘 일정 알려줘", "오늘 뭐 해야 되지?"];

// 세린은 Serin 화면에만 있는 존재가 아니라, 왕궁 전체를 돌아다니는 메이드봇입니다.
// 모든 화면 우측 하단에 떠 있고, "세린이 도와드릴까요?" 제안 패널과 함께
// 최소화/확장할 수 있습니다. 실제 대화는 Serin 화면(응접실)에서 이어집니다.
export function SerinFloatingWidget({ status, hasPendingAction, onOpenSerin, onQuickAsk }: SerinFloatingWidgetProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="serin-maidbot">
      {expanded && (
        <div className="serin-maidbot-popover game-panel">
          <div className="serin-maidbot-popover-head">
            <strong>세린이 도와드릴까요?</strong>
            <button type="button" aria-label="최소화" onClick={() => setExpanded(false)}>×</button>
          </div>
          <ul className="serin-maidbot-suggestions">
            {quickSuggestions.map((sentence) => (
              <li key={sentence}>
                <button type="button" onClick={() => onQuickAsk(sentence)}>
                  ✦ {sentence} <em>›</em>
                </button>
              </li>
            ))}
            <li>
              <button type="button" onClick={onOpenSerin}>
                ❖ 세린과 대화하기 <em>›</em>
              </button>
            </li>
          </ul>
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
