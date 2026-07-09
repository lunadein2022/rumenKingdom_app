import type { AppMockData } from "../../app/types";
import { Badge } from "../design-system/Badge";
import { Button } from "../design-system/Button";
import { ProgressBar } from "../design-system/ProgressBar";

interface ProgressScreenProps {
  data: AppMockData;
  onOpenProfile: () => void;
}

export function ProgressScreen({ data, onOpenProfile }: ProgressScreenProps) {
  const completedProjects = data.quests.filter((quest) => quest.type === "main" && quest.status === "completed").length;
  const activeProjects = data.quests.filter((quest) => quest.type === "main" && quest.status !== "completed").length;

  return (
    <section className="website-scene throne-scene">
      <div className="scene-shade" />
      <header className="scene-title-block">
        <Badge tone="gold">{data.princess.activeTitle}</Badge>
        <h1>왕좌의 방</h1>
        <p>공주님이 지금까지 해낸 일과 성장 기록을 확인하는 공간입니다.</p>
      </header>

      <img className="throne-princess" src="/assets/princess-full-transparent.png" alt="왕좌의 방에 선 공주" />

      <section className="throne-growth-hud">
        <div>
          <strong>Lv.{data.progress.level}</strong>
          <span>{data.progress.currentExp.toLocaleString()} / {data.progress.requiredExp.toLocaleString()} EXP</span>
        </div>
        <ProgressBar value={data.progress.expRate} label="Princess progress" />
        <div className="throne-stat-grid">
          <article><strong>{data.progress.completedQuests}</strong><span>완료 Todo</span></article>
          <article><strong>{completedProjects}</strong><span>완료 프로젝트</span></article>
          <article><strong>{activeProjects}</strong><span>진행 프로젝트</span></article>
          <article><strong>{data.progress.streakDays}</strong><span>연속 수행일</span></article>
        </div>
        <Button onClick={onOpenProfile}>공주 캐릭터 보기</Button>
      </section>
    </section>
  );
}
