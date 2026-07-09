import { FormEvent, useState } from "react";
import { Button } from "../../../components/design-system/Button";

interface SerinInputBarProps {
  onSend: (content: string) => void;
  onAttach: (type: "image" | "document" | "audio") => void;
}

export function SerinInputBar({ onSend, onAttach }: SerinInputBarProps) {
  const [input, setInput] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = input.trim();
    if (!value) return;
    onSend(value);
    setInput("");
  }

  return (
    <form className="chat-input-bar serin-input-bar" onSubmit={submit}>
      <div className="serin-attachment-row">
        <button type="button" onClick={() => onAttach("image")} aria-label="사진 첨부">사진</button>
        <button type="button" onClick={() => onAttach("document")} aria-label="파일 첨부">파일</button>
        <button type="button" onClick={() => onAttach("audio")} aria-label="음성 입력">음성</button>
      </div>
      <div className="serin-input-row">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="세린에게 부탁하기"
        />
        <Button type="submit" size="sm">전송</Button>
      </div>
    </form>
  );
}
