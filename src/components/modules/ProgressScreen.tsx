import type { AppMockData } from "../../app/types";
import { Badge } from "../design-system/Badge";
import { Button } from "../design-system/Button";
import { ProgressBar } from "../design-system/ProgressBar";

interface ProgressScreenProps {
  data: AppMockData;
  onOpenProfile: () => void;
}

export function ProgressScreen({ data, onOpenProfile }: ProgressScreenProps) {
  return (
    <section className="screen-stack">
      <header className="progress-hero">
        <img src="/assets/princess-full-transparent.png" alt="공주 전신" />
        <div>
          <Badge tone="gold">{data.princess.activeTitle}</Badge>
          <h1>Princess Growth</h1>
          <p>퀘스트, 업적, 보상은 모두 공주의 성장으로 연결됩니다.</p>
        </div>
      </header>

      <section className="progress-card">
        <div>
          <strong>Lv.{data.progress.level}</strong>
          <span>{data.progress.currentExp.toLocaleString()} / {data.progress.requiredExp.toLocaleString()} EXP</span>
        </div>
        <ProgressBar value={data.progress.expRate} label="Princess progress" />
      </section>

      <section className="growth-grid">
        <article><strong>{data.progress.completedQuests}</strong><span>완료 퀘스트</span></article>
        <article><strong>{data.progress.pendingRewards}</strong><span>대기 보상</span></article>
        <article><strong>{data.progress.streakDays}일</strong><span>연속 수행</span></article>
        <article><strong>{data.inventory.length}</strong><span>아이템</span></article>
      </section>

      <Button onClick={onOpenProfile}>공주 캐릭터 보기</Button>
    </section>
  );
}
