import { useState } from "react";
import type { CalendarEvent, MainQuest, PrincessProfile, RelationshipContact, SerinMessage, SerinProfile } from "../../../app/types";
import { Badge } from "../../../components/design-system/Badge";
import { SerinActionLogPanel } from "./SerinActionLogPanel";
import { SerinChatThread } from "./SerinChatThread";
import { SerinInputBar } from "./SerinInputBar";
import { SerinMemoryPanel } from "./SerinMemoryPanel";
import { SerinQuickActions } from "./SerinQuickActions";
import { SerinRecentPanel } from "./SerinRecentPanel";
import { SerinStatusOrb } from "./SerinStatusOrb";
import type { SerinAction, SerinActionLogEntry, SerinMemory, SerinStatus } from "../types/serin.types";

interface SerinPageProps {
  princess: PrincessProfile;
  serin: SerinProfile;
  messages: SerinMessage[];
  status: SerinStatus;
  pendingAction: SerinAction | null;
  memories: SerinMemory[];
  actionLog: SerinActionLogEntry[];
  mainQuests: MainQuest[];
  events: CalendarEvent[];
  contacts: RelationshipContact[];
  onSendMessage: (content: string) => void;
  onConfirmAction: (secondary?: boolean) => void;
  onCancelAction: () => void;
  onAttach: (type: "image" | "document" | "audio") => void;
}

// Serin 화면 = Princess OS의 진짜 메인 화면입니다("Chat이 아니라 Serin Agent").
// 3단 구조로 재설계했습니다:
//  - LEFT (serin-rail): 상태 / 기억 / 최근 활동(행동 로그) / 최근 프로젝트·일정·인연 / 예시 문장
//  - RIGHT (serin-chat-column): 대화 — 카카오톡 정도의 폭으로 제한, 화면을 다 채우지 않습니다
//  - BOTTOM (그 안의 입력창): Enter 전송 / Shift+Enter 줄바꿈, 클립+드래그앤드롭 첨부
// 대화 우선(conversation over buttons) 철학에 따라, 왼쪽의 예시 문장은 클릭해도
// 바로 실행되지 않고 입력창에 채워지기만 합니다.
export function SerinPage({
  princess,
  serin,
  messages,
  status,
  pendingAction,
  memories,
  actionLog,
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
    <section className="serin-screen serin-domain-page">
      <header className="serin-header">
        <div className="chat-avatar princess">
          <img src="/assets/princess-bust-transparent.webp" alt="공주" />
        </div>
        <div>
          <Badge tone="gold">{princess.activeTitle}</Badge>
          <h1>세린 에이전트</h1>
          <p>{serin.name}은 대화만으로 일정·Quest·프로젝트·다이어리·인연·기억을 대신 챙기는 AI 비서입니다.</p>
        </div>
        <div className="chat-avatar serin">
          <img src="/assets/serin-bust-transparent.webp" alt="세린" />
        </div>
      </header>

      <div className="serin-workspace">
        <aside className="serin-rail">
          <SerinStatusOrb status={status} />
          <SerinMemoryPanel memories={memories} />
          <SerinActionLogPanel entries={actionLog} />
          <SerinRecentPanel mainQuests={mainQuests} events={events} contacts={contacts} />
          <SerinQuickActions onPick={(sentence) => setPrefill(sentence)} />
        </aside>

        <div className="serin-chat-column">
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
      </div>
    </section>
  );
}
