import type { AppMockData } from "../../app/types";
import { Badge } from "../design-system/Badge";
import { Card } from "../design-system/Card";

interface QuestModuleProps {
  data: AppMockData;
}

export function QuestModule({ data }: QuestModuleProps) {
  return (
    <section className="module-stack">
      <Card>
        <div className="module-heading">
          <div>
            <h2>오늘의 퀘스트</h2>
            <p>공주가 직접 수행하는 하루의 행동 단위입니다. 보상과 EXP는 MockData 레이어에서 계산됩니다.</p>
          </div>
          <Badge tone="royal">{data.quests.length}개</Badge>
        </div>
      </Card>

      {data.quests.map((quest) => (
        <Card key={quest.id} className="list-card">
          <div>
            <Badge tone={quest.status === "completed" ? "success" : "soft"}>{quest.status}</Badge>
            <h3>{quest.title}</h3>
            <p>{quest.description}</p>
          </div>
          <div className="reward-pill">+{quest.expReward} EXP</div>
        </Card>
      ))}
    </section>
  );
}
