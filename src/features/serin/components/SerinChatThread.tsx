import type { SerinMessage } from "../../../app/types";
import { SerinMessageBubble } from "./SerinMessageBubble";

interface SerinChatThreadProps {
  messages: SerinMessage[];
}

export function SerinChatThread({ messages }: SerinChatThreadProps) {
  return (
    <div className="chat-thread serin-thread" aria-live="polite">
      {messages.map((message) => (
        <SerinMessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}
