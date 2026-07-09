import type { SerinMessage } from "../../../app/types";
import { Button } from "../../../components/design-system/Button";
import type { SerinAction } from "../types/serin.types";
import { SerinMessageBubble } from "./SerinMessageBubble";

interface SerinChatThreadProps {
  messages: SerinMessage[];
  pendingAction?: SerinAction | null;
  onConfirmAction?: (secondary?: boolean) => void;
  onCancelAction?: () => void;
}

// 구조화된 액션(퀘스트/일정 등록 등)의 확인 버튼을, 대화 밖 별도 카드가 아니라
// 해당 세린 메시지 바로 아래에 자연스럽게 붙여서 보여줍니다.
export function SerinChatThread({ messages, pendingAction, onConfirmAction, onCancelAction }: SerinChatThreadProps) {
  const lastMessage = messages[messages.length - 1];
  const showInlineConfirm =
    pendingAction && lastMessage?.sender === "serin" && lastMessage.messageType === "confirmation";

  return (
    <div className="chat-thread serin-thread" aria-live="polite">
      {messages.map((message) => {
        const isConfirmMessage = showInlineConfirm && message.id === lastMessage.id;
        return (
          <div key={message.id} className="chat-bubble-group">
            <SerinMessageBubble message={message} />
            {isConfirmMessage && pendingAction && (
              <div className="chat-inline-confirm">
                <Button size="sm" onClick={() => onConfirmAction?.(false)}>{pendingAction.confirmLabel}</Button>
                {pendingAction.secondaryLabel && (
                  <Button size="sm" variant="glass" onClick={() => onConfirmAction?.(true)}>
                    {pendingAction.secondaryLabel}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => onCancelAction?.()}>취소</Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
