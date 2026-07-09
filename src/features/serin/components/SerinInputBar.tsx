import { DragEvent, FormEvent, KeyboardEvent, useEffect, useState } from "react";
import { Button } from "../../../components/design-system/Button";

interface SerinInputBarProps {
  onSend: (content: string) => void;
  onAttach: (type: "image" | "document" | "audio", fileName?: string) => void;
  // 왼쪽 "예시로 말해보세요" 패널에서 문장을 고르면, 바로 전송하지 않고 입력창에
  // 채워서 공주님이 직접 확인/수정 후 보내도록 합니다(대화 우선 철학).
  prefill?: string;
  onPrefillConsumed?: () => void;
}

// 세린 입력창: Enter로 전송, Shift+Enter로 줄바꿈. 클립 버튼과 드래그앤드롭
// 모두 같은 onAttach 흐름으로 연결됩니다(사진/파일/음성 mock 처리 파이프라인).
// 실제 파일 내용을 아직 서버로 보내지 않으므로, 드롭된 파일의 확장자만 보고
// image/document/audio 중 하나로 분류해 onAttach에 전달합니다.
export function SerinInputBar({ onSend, onAttach, prefill, onPrefillConsumed }: SerinInputBarProps) {
  const [input, setInput] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (!prefill) return;
    setInput(prefill);
    onPrefillConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const value = input.trim();
    if (!value) return;
    onSend(value);
    setInput("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
    // Shift+Enter는 기본 동작(줄바꿈)을 그대로 둡니다.
  }

  function classifyFile(name: string): "image" | "document" | "audio" {
    const lower = name.toLowerCase();
    if (/\.(png|jpe?g|gif|webp|heic)$/.test(lower)) return "image";
    if (/\.(mp3|wav|m4a|ogg)$/.test(lower)) return "audio";
    return "document";
  }

  function handleDrop(event: DragEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsDragOver(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length === 0) return;
    files.forEach((file) => onAttach(classifyFile(file.name), file.name));
  }

  return (
    <form
      className={`chat-input-bar serin-input-bar${isDragOver ? " drag-over" : ""}`}
      onSubmit={submit}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {isDragOver && <div className="serin-drop-hint">여기에 놓으면 세린이 확인해요 (사진 / 파일 / 음성)</div>}

      {showAttachMenu && (
        <div className="serin-attachment-row">
          <button type="button" onClick={() => { onAttach("image"); setShowAttachMenu(false); }} aria-label="사진 첨부">📷 사진</button>
          <button type="button" onClick={() => { onAttach("document"); setShowAttachMenu(false); }} aria-label="파일 첨부">📄 파일</button>
          <button type="button" onClick={() => { onAttach("audio"); setShowAttachMenu(false); }} aria-label="음성 입력">🎙 음성</button>
        </div>
      )}

      <div className="serin-input-row">
        <button
          type="button"
          className="serin-clip-button"
          onClick={() => setShowAttachMenu((current) => !current)}
          aria-label="파일 첨부 메뉴 열기"
        >
          📎
        </button>
        <textarea
          rows={1}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="세린에게 부탁하기 (Enter 전송, Shift+Enter 줄바꿈)"
        />
        <Button type="submit" size="sm">전송</Button>
      </div>
    </form>
  );
}
