import { useState } from "react";
import type { CalendarEvent, MainQuest, PrincessProfile, RelationshipContact, SerinMessage, SerinProfile } from "../../../app/types";
import { SerinChatThread } from "./SerinChatThread";
import { SerinInputBar } from "./SerinInputBar";
import { SerinQuickActions } from "./SerinQuickActions";
import type { SerinAction, SerinMemory, SerinStatus } from "../types/serin.types";

interface SerinPageProps {
  princess: PrincessProfile;
  serin: SerinProfile;
  messages: SerinMessage[];
  status: SerinStatus;
  pendingAction: SerinAction | null;
  memories: SerinMemory[];
  mainQuests: MainQuest[];
  events: CalendarEvent[];
  contacts: RelationshipContact[];
  onSendMessage: (content: string) => void;
  onConfirmAction: (secondary?: boolean) => void;
  onCancelAction: () => void;
  onAttach: (type: "image" | "document" | "audio") => void;
}

const statusLabel: Record<SerinStatus, string> = {
  idle: "대기 중",
  thinking: "생각하는 중",
  speaking: "말하는 중",
  error: "잠시 흔들림",
};

export function SerinPage({
  serin,
  messages,
  status,
  pendingAction,
  memories,
  mainQuests,
  events,
  contacts,
  onSendMessage,
  onConfirmAction,
  onCancelAction,
  onAttach,
}: SerinPageProps) {
  const [prefill, setPrefill] = useState("");

  return (
    <section className="serin-scene scene-fullbleed">
      <div className="serin-scene-backdrop" style={{ backgroundImage: 'url("/assets/ballroom.webp")' }} />

      <img className="serin-scene-figure" src="/assets/serin-full-final.png" alt="세린" />

      <div className="serin-scene-rail">
        <section className="serin-identity-panel">
          <img src="/assets/serin-avatar-final.png" alt="세린" />
          <strong>{serin.name}</strong>
          <p>공주님의 말을 듣고, 일정과 Quest를 조심스럽게 정리합니다.</p>
          <span>프로젝트 {mainQuests.length}개 · 일정 {events.length}개 · 인연 {contacts.length}명 · 참고 메모 {memories.length}개</span>
        </section>
        <SerinQuickActions onPick={(sentence) => setPrefill(sentence)} />
      </div>

      <div className="serin-scene-chat">
        <div className={`serin-chat-status ${status}`}>
          <em />
          {serin.name} · {statusLabel[status]}
        </div>
        <SerinChatThread
          messages={messages}
          pendingAction={pendingAction}
          onConfirmAction={onConfirmAction}
          onCancelAction={onCancelAction}
        />
        <SerinInputBar
          onSend={onSendMessage}
          onAttach={onAttach}
          prefill={prefill}
          onPrefillConsumed={() => setPrefill("")}
        />
      </div>
    </section>
  );
}
