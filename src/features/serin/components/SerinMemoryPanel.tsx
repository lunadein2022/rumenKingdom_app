import type { SerinMemory } from "../types/serin.types";

interface SerinMemoryPanelProps {
  memories: SerinMemory[];
  peopleCount: number;
  projectCount: number;
}

// 세린의 기억 = "저장된 메모리 미리보기" 정도로만 보여줍니다. 여러 장의 카드가
// 아니라 루틴/선호/최근 기억/기억된 사람·프로젝트 수 네 줄짜리 요약입니다.
export function SerinMemoryPanel({ memories, peopleCount, projectCount }: SerinMemoryPanelProps) {
  const routine = memories.find((memory) => memory.memoryType === "routine");
  const preference = memories.find((memory) => memory.memoryType === "preference");
  const latest = memories[0];

  return (
    <section className="serin-memory-preview">
      <h2>세린의 기억</h2>
      <dl>
        <div>
          <dt>루틴</dt>
          <dd>{routine?.content ?? "아직 기억해둔 루틴이 없어요."}</dd>
        </div>
        <div>
          <dt>선호</dt>
          <dd>{preference?.content ?? "아직 기억해둔 선호가 없어요."}</dd>
        </div>
        <div>
          <dt>최근 기억</dt>
          <dd>{latest?.content ?? "아직 저장된 기억이 없어요."}</dd>
        </div>
        <div>
          <dt>기억된 사람 / 프로젝트</dt>
          <dd>{peopleCount}명 · {projectCount}개</dd>
        </div>
      </dl>
    </section>
  );
}
