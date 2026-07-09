import { useEffect, useState } from "react";
import { deleteMemory, saveMemory, searchMemory } from "../services/serinMemoryService";
import type { SerinMemory } from "../types/serin.types";

const MEMORY_KEY = "princess-os.serin-memory";

function loadMemories(initialMemories: SerinMemory[]) {
  if (typeof window === "undefined") return initialMemories;
  try {
    const stored = window.localStorage.getItem(MEMORY_KEY);
    if (!stored) return initialMemories;
    const parsed = JSON.parse(stored) as SerinMemory[];
    return Array.isArray(parsed) ? parsed : initialMemories;
  } catch {
    return initialMemories;
  }
}

export function useSerinMemory(initialMemories: SerinMemory[] = []) {
  const [memories, setMemories] = useState(() => loadMemories(initialMemories));

  useEffect(() => {
    window.localStorage.setItem(MEMORY_KEY, JSON.stringify(memories));
  }, [memories]);

  return {
    memories,
    saveMemory: (input: Omit<SerinMemory, "id" | "createdAt">) => setMemories((current) => saveMemory(current, input)),
    searchMemory: (query: string) => searchMemory(memories, query),
    deleteMemory: (id: string) => setMemories((current) => deleteMemory(current, id)),
  };
}
