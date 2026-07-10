import { useEffect, useRef } from "react";
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
//
// 대화창은 고정 높이 스크롤 영역입니다(부모 .serin-scene-chat이 뷰포트에
// 맞춘 높이를 주고, 이 컴포넌트는 overflow-y:auto로 자기 안에서만 스크롤됩니다).
// 새 메시지가 오면 항상 맨 아래로 자동 스크롤합니다. 대화 내용은 세션 상태에만
// 있으므로 새로고침하면 자동으로 사라집니다(별도 초기화 로직 불필요).
export function SerinChatThread({ messages, pendingAction, onConfirmAction, onCancelAction }: SerinChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessage = messages[messages.length - 1];
  const showInlineConfirm =
    pendingAction && lastMessage?.sender === "serin" && lastMessage.messageType === "confirmation";

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  return (
    <div className="chat-thread serin-thread" ref={scrollRef} aria-live="polite">
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
