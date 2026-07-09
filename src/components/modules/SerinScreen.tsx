import { FormEvent, useState } from "react";
import type { PrincessProfile, SerinMessage, SerinProfile } from "../../app/types";
import { Badge } from "../design-system/Badge";
import { Button } from "../design-system/Button";

interface SerinScreenProps {
  princess: PrincessProfile;
  serin: SerinProfile;
  messages: SerinMessage[];
  onSendMessage: (content: string) => void;
}

const quickActions = ["오늘 브리핑", "퀘스트 우선순위", "일정 정리"];

export function SerinScreen({ princess, serin, messages, onSendMessage }: SerinScreenProps) {
  const [input, setInput] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = input.trim();
    if (!value) return;
    onSendMessage(value);
    setInput("");
  }

  return (
    <section className="serin-screen">
      <header className="serin-header">
        <div className="chat-avatar princess">
          <img src="/assets/princess-bust-transparent.png" alt="공주" />
        </div>
        <div>
          <Badge tone="gold">{princess.activeTitle}</Badge>
          <h1>세린과 대화</h1>
          <p>{serin.name}은 공주님의 하루를 보좌하는 AI 메이드입니다.</p>
        </div>
        <div className="chat-avatar serin">
          <img src="/assets/serin-bust-transparent.png" alt="세린" />
        </div>
      </header>

      <div className="quick-actions">
        {quickActions.map((action) => (
          <button key={action} type="button" onClick={() => onSendMessage(action)}>
            {action}
          </button>
        ))}
      </div>

      <div className="chat-thread" aria-live="polite">
        {messages.map((message) => (
          <article className={`chat-bubble ${message.sender}`} key={message.id}>
            <span>{message.sender === "princess" ? "공주" : "세린"}</span>
            <p>{message.content}</p>
          </article>
        ))}
      </div>

      <form className="chat-input-bar" onSubmit={submit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="세린에게 물어보기"
        />
        <Button type="submit" size="sm">전송</Button>
      </form>
    </section>
  );
}
