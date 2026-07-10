import { useState } from "react";
import type { CalendarEvent, MainQuest, PrincessProfile, RelationshipContact, SerinMessage, SerinProfile } from "../../../app/types";
import { SerinChatThread } from "./SerinChatThread";
import { SerinInputBar } from "./SerinInputBar";
import { SerinMemoryPanel } from "./SerinMemoryPanel";
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
  thinking: "생각하는 중…",
  speaking: "말하는 중",
  error: "잠시 흐트러짐",
};

// Serin 화면 = 세린과 만나는 왕궁 응접실입니다. 이 공간의 주인은 세린이므로
// 공주 이미지는 두지 않고, 화면 중앙(왼쪽 패널과 채팅창 사이)에 세린만 크게
// 배치합니다. 어떤 패널/카드도 세린을 가리지 않습니다(세린이 항상 위 레이어).
export function SerinPage({
  serin,
  messages,
  status,
  pendingAction,
  memories,
  mainQuests,
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

      <img className="serin-scene-figure" src="/assets/serin-full-transparent.webp" alt="세린" />

      <div className="serin-scene-rail">
        <SerinMemoryPanel memories={memories} peopleCount={contacts.length} projectCount={mainQuests.length} />
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
