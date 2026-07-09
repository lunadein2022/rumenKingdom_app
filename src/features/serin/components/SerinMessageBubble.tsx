import type { SerinMessage } from "../../../app/types";

interface SerinMessageBubbleProps {
  message: SerinMessage;
}

// 세린 행동 로그(action_log) 메시지는 일반 대화 말풍선과 다르게, "등록했습니다"
// 한 줄이 아니라 실제로 무엇을 했는지 도메인별 상세 내역을 여러 줄로 보여줍니다.
// 그래서 별도 스타일(chat-bubble.action-log)로 구분해서 렌더링합니다.
export function SerinMessageBubble({ message }: SerinMessageBubbleProps) {
  if (message.messageType === "action_log") {
    return (
      <article className="chat-bubble serin action-log">
        <span>세린 행동 로그</span>
        <p style={{ whiteSpace: "pre-wrap" }}>{message.content}</p>
      </article>
    );
  }

  return (
    <article className={`chat-bubble ${message.sender}`}>
      <span>{message.sender === "princess" ? "공주" : "세린"}</span>
      <p style={{ whiteSpace: "pre-wrap" }}>{message.content}</p>
    </article>
  );
}
