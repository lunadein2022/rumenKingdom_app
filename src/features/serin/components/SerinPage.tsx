import type { PrincessProfile, SerinMessage, SerinProfile } from "../../../app/types";
import { Badge } from "../../../components/design-system/Badge";
import { SerinChatThread } from "./SerinChatThread";
import { SerinConfirmationCard } from "./SerinConfirmationCard";
import { SerinInputBar } from "./SerinInputBar";
import { SerinMemoryPanel } from "./SerinMemoryPanel";
import { SerinQuickActions } from "./SerinQuickActions";
import { SerinStatusOrb } from "./SerinStatusOrb";
import type { SerinAction, SerinMemory, SerinStatus } from "../types/serin.types";

interface SerinPageProps {
  princess: PrincessProfile;
  serin: SerinProfile;
  messages: SerinMessage[];
  status: SerinStatus;
  pendingAction: SerinAction | null;
  memories: SerinMemory[];
  onSendMessage: (content: string) => void;
  onConfirmAction: (secondary?: boolean) => void;
  onCancelAction: () => void;
  onAttach: (type: "image" | "document" | "audio") => void;
}

export function SerinPage({
  princess,
  serin,
  messages,
  status,
  pendingAction,
  memories,
  onSendMessage,
  onConfirmAction,
  onCancelAction,
  onAttach,
}: SerinPageProps) {
  return (
    <section className="serin-screen serin-domain-page">
      <div className="serin-side">
        <header className="serin-header">
          <div className="chat-avatar princess">
            <img src="/assets/princess-bust-transparent.webp" alt="공주" />
          </div>
          <div>
            <Badge tone="gold">{princess.activeTitle}</Badge>
            <h1>세린과 대화</h1>
            <p>{serin.name}은 공주님의 하루를 실제 기능으로 연결하는 AI 메이드입니다.</p>
          </div>
          <div className="chat-avatar serin">
            <img src="/assets/serin-bust-transparent.webp" alt="세린" />
          </div>
        </header>
        <SerinStatusOrb status={status} />
        <SerinMemoryPanel memories={memories} />
      </div>

      <div className="serin-main">
        <SerinChatThread messages={messages} />
        {pendingAction && (
          <SerinConfirmationCard
            action={pendingAction}
            onConfirm={onConfirmAction}
            onCancel={onCancelAction}
          />
        )}
        <SerinQuickActions onAction={onSendMessage} />
        <SerinInputBar onSend={onSendMessage} onAttach={onAttach} />
      </div>
    </section>
  );
}
