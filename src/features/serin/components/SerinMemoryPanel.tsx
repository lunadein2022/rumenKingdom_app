import type { SerinMemory } from "../types/serin.types";

interface SerinMemoryPanelProps {
  memories: SerinMemory[];
}

export function SerinMemoryPanel({ memories }: SerinMemoryPanelProps) {
  return (
    <section className="serin-memory-panel">
      <div>
        <h2>세린의 기억</h2>
        <span>{memories.length}개</span>
      </div>
      {memories.length === 0 ? (
        <p>아직 저장된 기억이 없습니다.</p>
      ) : (
        memories.slice(0, 3).map((memory) => (
          <article key={memory.id}>
            <strong>{memory.memoryType}</strong>
            <span>{memory.content}</span>
          </article>
        ))
      )}
    </section>
  );
}
