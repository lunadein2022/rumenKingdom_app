import { useState } from "react";
import type { SerinMessage } from "../../../app/types";
import type { SerinStatus } from "../types/serin.types";

export function useSerinChat(initialMessages: SerinMessage[]) {
  const [messages, setMessages] = useState(initialMessages);
  const [status, setStatus] = useState<SerinStatus>("idle");

  return {
    messages,
    setMessages,
    status,
    setStatus,
  };
}
