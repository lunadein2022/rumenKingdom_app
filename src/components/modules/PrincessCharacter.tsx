import type { AppMockData } from "../../app/types";
import { Badge } from "../design-system/Badge";
import { Card } from "../design-system/Card";
import { ProgressBar } from "../design-system/ProgressBar";

interface PrincessCharacterProps {
  data: AppMockData;
}

export function PrincessCharacter({ data }: PrincessCharacterProps) {
  return (
    <section className="module-grid princess-module">
      <aside className="princess-visual-panel">
        <Badge tone="gold">{data.princess.activeTitle}</Badge>
        <img src="/assets/princess-full.png" alt="공주 전신" />
      </aside>

      <div className="module-stack">
        <Card>
          <div className="module-heading">
            <div>
              <h2>{data.princess.displayName}</h2>
              <p>퀘스트를 수행하고, 칭호와 보상을 장착하며, 왕성 성장의 중심이 되는 사용자 캐릭터입니다.</p>
            </div>
            <Badge tone="gold">Lv.{data.progress.level}</Badge>
          </div>
          <ProgressBar value={data.progress.expRate} label="Princess character EXP" />
          <p className="small-copy">
            EXP {data.progress.currentExp.toLocaleString()} / {data.progress.requiredExp.toLocaleString()}
          </p>
        </Card>

        <Card>
          <h3>능력치</h3>
          <div className="stat-grid">
            {Object.entries(data.princess.stats).map(([key, value]) => (
              <div className="stat-card" key={key}>
                <strong>{value}</strong>
                <span>{key}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3>착용 아이템</h3>
          <div className="equipment-grid">
            {data.princess.equippedItems.map((item) => (
              <div className="equipment-slot" key={item.slot}>
                <span>{item.slot}</span>
                <strong>{item.name}</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3>Royal Titles</h3>
          <div className="title-row">
            {data.titles.map((title) => (
              <span className={title.equipped ? "title-chip active" : "title-chip"} key={title.key}>
                {title.name}
              </span>
            ))}
          </div>
        </Card>

        <Card className="relationship-card">
          <img src="/assets/serin-bust.png" alt="세린" />
          <div>
            <h3>세린과의 관계</h3>
            <p>
              {data.serin.relationshipLabel} {data.serin.affinity}%. 세린이 공주님의 업무 패턴을 점점 더 잘 이해하고 있습니다.
            </p>
            <ProgressBar value={data.serin.affinity} label="Serin relationship" />
          </div>
        </Card>
      </div>
    </section>
  );
}
