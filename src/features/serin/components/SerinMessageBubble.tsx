import type { SerinMessage } from "../../../app/types";

interface SerinMessageBubbleProps {
  message: SerinMessage;
}

export function SerinMessageBubble({ message }: SerinMessageBubbleProps) {
  return (
    <article className={`chat-bubble ${message.sender}`}>
      <span>{message.sender === "princess" ? "공주" : "세린"}</span>
      <p>{message.content}</p>
    </article>
  );
}
