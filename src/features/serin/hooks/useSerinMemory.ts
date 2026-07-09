import { useState } from "react";
import { deleteMemory, saveMemory, searchMemory } from "../services/serinMemoryService";
import type { SerinMemory } from "../types/serin.types";

export function useSerinMemory(initialMemories: SerinMemory[] = []) {
  const [memories, setMemories] = useState(initialMemories);

  return {
    memories,
    saveMemory: (input: Omit<SerinMemory, "id" | "createdAt">) => setMemories((current) => saveMemory(current, input)),
    searchMemory: (query: string) => searchMemory(memories, query),
    deleteMemory: (id: string) => setMemories((current) => deleteMemory(current, id)),
  };
}
