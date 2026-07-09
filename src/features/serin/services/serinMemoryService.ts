import type { SerinMemory } from "../types/serin.types";

export function saveMemory(memories: SerinMemory[], input: Omit<SerinMemory, "id" | "createdAt">) {
  // TODO: Replace with Supabase Query
  return [
    {
      ...input,
      id: `memory-${Date.now()}`,
      createdAt: new Date().toISOString(),
    },
    ...memories,
  ];
}

export function searchMemory(memories: SerinMemory[], query: string) {
  // TODO: Replace with Supabase Query
  return memories.filter((memory) => memory.content.includes(query));
}

export function getRelevantMemories(memories: SerinMemory[], context: string) {
  // TODO: Replace with Supabase Query
  return memories.filter((memory) => context.includes(memory.memoryType) || memory.importance === "high");
}

export function deleteMemory(memories: SerinMemory[], id: string) {
  // TODO: Replace with Supabase Query
  return memories.filter((memory) => memory.id !== id);
}
