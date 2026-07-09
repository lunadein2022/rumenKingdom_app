import type { SerinActionLogEntry } from "../types/serin.types";

interface SerinActionLogPanelProps {
  entries: SerinActionLogEntry[];
}

const domainIcon: Record<SerinActionLogEntry["domain"], string> = {
  calendar: "📅",
  quest: "✅",
  project: "📁",
  diary: "📔",
  memory: "🧠",
  relationship: "🤝",
  library: "📚",
};

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// 왼쪽 레일의 "세린이 실제로 한 일" 타임라인입니다. "등록했습니다" 한 줄이 아니라,
// 시각 + 도메인 아이콘 + 무엇을 했는지를 짧게 나열해서 "세린이 OS 안에서 실제로
// 일하고 있다"는 느낌을 줍니다. 대화창에는 더 상세한 버전(action_log 메시지)이 따로 있습니다.
export function SerinActionLogPanel({ entries }: SerinActionLogPanelProps) {
  return (
    <section className="serin-action-log-panel">
      <div>
        <h2>세린의 최근 활동</h2>
        <span>{entries.length}건</span>
      </div>
      {entries.length === 0 ? (
        <p className="small-copy">아직 처리한 작업이 없습니다. 세린에게 무언가 부탁해보세요.</p>
      ) : (
        <ul>
          {entries.slice(0, 8).map((entry) => (
            <li key={entry.id}>
              <span className="serin-action-log-time">{formatTime(entry.timestamp)}</span>
              <span className="serin-action-log-icon">{domainIcon[entry.domain]}</span>
              <span className="serin-action-log-label">{entry.label}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
