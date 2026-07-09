import type { AppMockData } from "../../../app/types";
import { Badge } from "../../../components/design-system/Badge";
import { ProgressBar } from "../../../components/design-system/ProgressBar";
import { buildPrincessStats, getDailyFate } from "../services/princessService";

interface PrincessPageProps {
  data: AppMockData;
}

export function PrincessPage({ data }: PrincessPageProps) {
  const princess = data.princess;
  const stats = buildPrincessStats(princess);
  const fate = getDailyFate();

  return (
    <section className="princess-domain-page">
      <header className="princess-domain-hero">
        <div>
          <Badge tone="gold">{princess.activeTitle}</Badge>
          <h1>{princess.displayName}</h1>
          <p>Princess는 프로필이 아니라 Princess OS의 플레이어 캐릭터입니다.</p>
        </div>
        <img src="/assets/princess-full-transparent.webp" alt="공주 전신" />
      </header>

      <section className="princess-progress-card">
        <div>
          <strong>Lv.{princess.level}</strong>
          <span>{princess.currentExp} / {princess.requiredExp} EXP</span>
        </div>
        <ProgressBar value={Math.round((princess.currentExp / princess.requiredExp) * 100)} label="Princess EXP" />
      </section>

      <section className="princess-fate-card">
        <Badge tone="royal">오늘의 Fate</Badge>
        <h2>{fate.theme}</h2>
        <p>{fate.fortune}</p>
        <span>{fate.recommendedQuest}</span>
      </section>

      <section className="princess-stat-list">
        {Object.entries(stats).map(([key, value]) => (
          <article key={key}>
            <strong>{key}</strong>
            <span>{value}</span>
          </article>
        ))}
      </section>

      <section className="princess-equipment-list">
        <h2>착용 장비</h2>
        {princess.equippedItems.map((item) => (
          <article key={item.slot}>
            <strong>{item.slot}</strong>
            <span>{item.name}</span>
          </article>
        ))}
      </section>
    </section>
  );
}
