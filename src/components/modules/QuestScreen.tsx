import { useMemo, useState } from "react";
import type { Quest, QuestCompletionEvent, QuestHistoryEntry, QuestType, UserProgress } from "../../app/types";
import { questTypeMeta } from "../../domain/questDomain";
import { Badge } from "../design-system/Badge";
import { Button } from "../design-system/Button";
import { ProgressBar } from "../design-system/ProgressBar";

interface QuestScreenProps {
  quests: Quest[];
  history: QuestHistoryEntry[];
  progress: UserProgress;
  completionEvents: QuestCompletionEvent[];
  onCompleteQuest: (id: string) => void;
  onCycleQuest: (id: string) => void;
}

const questTabs: QuestType[] = ["main", "side", "daily", "routine", "story"];

function statusText(status: Quest["status"]) {
  if (status === "completed") return "왕국도서관";
  if (status === "inProgress") return "진행중";
  return "대기";
}

export function QuestScreen({
  quests,
  history,
  progress,
  completionEvents,
  onCompleteQuest,
  onCycleQuest,
}: QuestScreenProps) {
  const [activeType, setActiveType] = useState<QuestType>("main");
  const [showHistory, setShowHistory] = useState(false);
  const visibleQuests = useMemo(
    () => quests.filter((quest) => quest.type === activeType && (showHistory || quest.status !== "completed")),
    [activeType, quests, showHistory],
  );

  return (
    <section className="quest-domain-screen">
      <header className="quest-domain-hero">
        <Badge tone="gold">Quest Domain</Badge>
        <h1>왕실 퀘스트</h1>
        <p>Quest Domain은 Princess OS의 다른 모든 시스템(Calendar, Serin, Castle, Achievement, Inventory, Diary, Notification)의 허브입니다.</p>
        <div className="quest-hero-stats">
          <div><strong>{progress.todayProgress}%</strong><span>오늘 진행률</span></div>
          <div><strong>Lv.{progress.level}</strong><span>레벨</span></div>
          <div><strong>{progress.todayCompletedQuests}/{progress.todayTotalQuests}</strong><span>오늘 완료</span></div>
        </div>
        <ProgressBar value={progress.expRate} label="Quest EXP" />
      </header>

      <nav className="quest-tabs" aria-label="Quest types">
        {questTabs.map((type) => (
          <button
            key={type}
            type="button"
            className={activeType === type ? "active" : ""}
            onClick={() => setActiveType(type)}
          >
            <span>{questTypeMeta[type].icon}</span>
            <span>{questTypeMeta[type].label}</span>
          </button>
        ))}
      </nav>

      {completionEvents.length > 0 && (
        <section className="quest-completion-flow" aria-label="Quest completion flow">
          {completionEvents.map((event) => (
            <span key={event.type}>{event.label}</span>
          ))}
        </section>
      )}

      <div className="quest-toolbar">
        <button type="button" onClick={() => setShowHistory((value) => !value)}>
          {showHistory ? "진행 퀘스트 보기" : "완료 보기 · 왕국도서관"}
        </button>
      </div>

      <div className="quest-list rpg">
        {visibleQuests.length === 0 ? (
          <article className="quest-empty">
            <strong>현재 표시할 퀘스트가 없습니다.</strong>
            <span>완료된 퀘스트는 왕국도서관에 보관됩니다.</span>
          </article>
        ) : (
          visibleQuests.map((quest) => (
            <article className={quest.status === "completed" ? "quest-card rpg completed" : "quest-card rpg"} key={quest.id}>
              <div className="quest-card-head">
                <div>
                  <span className="quest-icon">{questTypeMeta[quest.type].icon}</span>
                  <Badge tone={quest.status === "completed" ? "success" : "soft"}>{statusText(quest.status)}</Badge>
                </div>
                <strong>EXP +{quest.expReward}</strong>
              </div>
              <h2>{quest.title}</h2>
              <p>{quest.description}</p>
              {quest.chapter && <span className="quest-chapter">{quest.chapter}</span>}
              <div className="quest-meta-row">
                <span>보상 {quest.rewardItem ?? `${quest.goldReward} Gold`}</span>
                <span>마감 {quest.dueDate}</span>
              </div>
              <ProgressBar value={quest.progress} label={`${quest.title} progress`} />
              <div className="quest-actions">
                <Button variant="glass" size="sm" onClick={() => onCycleQuest(quest.id)}>
                  계속
                </Button>
                <Button size="sm" onClick={() => onCompleteQuest(quest.id)} disabled={quest.status === "completed"}>
                  완료
                </Button>
              </div>
            </article>
          ))
        )}
      </div>

      {showHistory && (
        <section className="quest-history">
          <h2>왕국도서관 기록</h2>
          {history.map((item) => (
            <article key={item.id}>
              <strong>EXP +{item.rewardExp}</strong>
              <span>{item.note}</span>
            </article>
          ))}
        </section>
      )}
    </section>
  );
}
