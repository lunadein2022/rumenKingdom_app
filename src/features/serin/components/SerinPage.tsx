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

// Serin 화면 = "업무 대시보드"가 아니라 세린과 만나는 왕궁 응접실입니다.
// Scene First: 배경(응접실)과 세린/공주 캐릭터가 항상 화면 안에 존재하고,
// 그 위에 3개 영역(대화 / 추천 문장 / 세린의 기억)만 Glass Overlay로 떠 있습니다.
// 대화창은 카카오톡 정도의 폭으로 제한해, 배경과 캐릭터가 항상 함께 보입니다.
export function SerinPage({
  princess,
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

      <header className="serin-scene-topbar">
        <span className="serin-scene-crest">♛ {princess.activeTitle}</span>
        <span className={`serin-scene-status ${status}`}>
          <em />
          {serin.name} · {statusLabel[status]}
        </span>
      </header>

      <div className="serin-scene-figures">
        <img src="/assets/serin-full-transparent.webp" alt="세린" />
        <img src="/assets/princess-full-transparent.webp" alt="공주" />
      </div>

      <div className="serin-scene-rail">
        <SerinMemoryPanel memories={memories} peopleCount={contacts.length} projectCount={mainQuests.length} />
        <SerinQuickActions onPick={(sentence) => setPrefill(sentence)} />
      </div>

      <div className="serin-scene-chat">
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
