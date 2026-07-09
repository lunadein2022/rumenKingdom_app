import type { AppMockData, ViewKey } from "../../app/types";
import { Badge } from "../design-system/Badge";
import { Card } from "../design-system/Card";

interface SystemModuleProps {
  data: AppMockData;
  view: Exclude<ViewKey, "home" | "quests" | "calendar" | "profile">;
}

export function SystemModule({ data, view }: SystemModuleProps) {
  const copy = {
    castle: {
      title: "Castle Growth System",
      body: "왕성의 방 성장 상태와 해금 흐름을 관리하는 모듈입니다.",
      count: data.rooms.length,
    },
    achievements: {
      title: "Achievement System",
      body: "업적과 해금 조건을 user_achievements에 연결할 준비가 된 모듈입니다.",
      count: data.achievements.length,
    },
    inventory: {
      title: "Inventory System",
      body: "착용 아이템과 보상 장착 상태를 inventory_items와 연결합니다.",
      count: data.inventory.length,
    },
    serin: {
      title: "Serin AI Screen",
      body: "세린은 주인공이 아니라 보좌관입니다. 대화와 기억은 serin_conversations, serin_memory로 연결됩니다.",
      count: data.serin.affinity,
    },
  }[view];

  return (
    <section className="module-stack">
      <Card>
        <div className="module-heading">
          <div>
            <h2>{copy.title}</h2>
            <p>{copy.body}</p>
          </div>
          <Badge tone={view === "serin" ? "gold" : "royal"}>{copy.count}</Badge>
        </div>
      </Card>
      <Card className="two-character-note">
        <img src="/assets/princess-bust.png" alt="공주" />
        <div>
          <h3>공주 중심 유지</h3>
          <p>
            기존 시스템을 보존하되, 모든 진행과 보상은 공주 캐릭터의 성장으로 귀결되도록 정리했습니다.
          </p>
        </div>
        <img src="/assets/serin-bust.png" alt="세린" />
      </Card>
    </section>
  );
}
