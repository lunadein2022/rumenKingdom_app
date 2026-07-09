import { useMemo } from "react";
import { parseIntent } from "../services/serinIntentParser";

export function useSerinIntent(message: string) {
  return useMemo(() => parseIntent(message), [message]);
}
