import type { Quest, UserProgress } from "../../app/types";
import { Badge } from "../design-system/Badge";
import { Button } from "../design-system/Button";
import { ProgressBar } from "../design-system/ProgressBar";

interface QuestScreenProps {
  quests: Quest[];
  progress: UserProgress;
  onCompleteQuest: (id: string) => void;
  onCycleQuest: (id: string) => void;
}

function statusText(status: Quest["status"]) {
  if (status === "completed") return "완료";
  if (status === "inProgress") return "진행중";
  return "대기";
}

export function QuestScreen({ quests, progress, onCompleteQuest, onCycleQuest }: QuestScreenProps) {
  return (
    <section className="screen-stack">
      <header className="screen-header">
        <Badge tone="royal">Quest</Badge>
        <h1>오늘의 퀘스트</h1>
        <p>완료한 퀘스트는 Princess EXP와 보상 대기 수에 즉시 반영됩니다.</p>
      </header>

      <section className="quest-progress-panel">
        <div>
          <strong>{progress.todayCompletedQuests}/{progress.todayTotalQuests}</strong>
          <span>오늘 진행률 {progress.todayProgress}%</span>
        </div>
        <ProgressBar value={progress.todayProgress} label="Today quest progress" />
      </section>

      <div className="quest-list">
        {quests.map((quest) => (
          <article className={quest.status === "completed" ? "quest-card completed" : "quest-card"} key={quest.id}>
            <div className="quest-card-head">
              <Badge tone={quest.status === "completed" ? "success" : "soft"}>{statusText(quest.status)}</Badge>
              <span>+{quest.expReward} EXP</span>
            </div>
            <h2>{quest.title}</h2>
            <p>{quest.description}</p>
            <div className="quest-actions">
              <Button variant="glass" size="sm" onClick={() => onCycleQuest(quest.id)}>상태 변경</Button>
              <Button size="sm" onClick={() => onCompleteQuest(quest.id)} disabled={quest.status === "completed"}>
                완료
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
