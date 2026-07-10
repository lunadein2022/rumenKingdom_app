import { useMemo, useState } from "react";
import type { MainQuest, Quest, QuestCompletionEvent, QuestHistoryEntry, QuestType, UserProgress } from "../../app/types";
import { questTypeMeta } from "../../domain/questDomain";
import { Badge } from "../design-system/Badge";
import { Button } from "../design-system/Button";
import { ProgressBar } from "../design-system/ProgressBar";

interface QuestScreenProps {
  quests: Quest[];
  mainQuests: MainQuest[];
  history: QuestHistoryEntry[];
  progress: UserProgress;
  completionEvents: QuestCompletionEvent[];
  onToggleQuest: (id: string, completed: boolean) => void;
  onCycleQuest: (id: string) => void;
}

type QuestTimeScope = "past" | "current" | "future" | "all";

// 메인퀘스트(=프로젝트)는 Office가 관리합니다. 이 화면은 실행형 퀘스트
// (서브/일일/반복/스토리)만 실행(체크/완료)하는 공간입니다.
const questTabs: QuestType[] = ["daily", "routine", "side", "story"];
const timeTabs: Array<{ key: QuestTimeScope; label: string }> = [
  { key: "past", label: "이전" },
  { key: "current", label: "현재" },
  { key: "future", label: "이후" },
  { key: "all", label: "전체" },
];
const today = "2026-07-09";

function statusText(status: Quest["status"]) {
  if (status === "completed") return "왕국도서관";
  if (status === "inProgress") return "진행 중";
  return "대기";
}

function inScope(quest: Quest, scope: QuestTimeScope) {
  if (scope === "all") return true;
  if (scope === "past") return quest.dueDate < today || quest.status === "completed";
  if (scope === "future") return quest.dueDate > today && quest.status !== "completed";
  return quest.dueDate === today || quest.status === "inProgress";
}

export function QuestScreen({
  quests,
  mainQuests,
  history,
  progress,
  completionEvents,
  onToggleQuest,
  onCycleQuest,
}: QuestScreenProps) {
  const [activeType, setActiveType] = useState<QuestType>("daily");
  const [timeScope, setTimeScope] = useState<QuestTimeScope>("current");
  const [showHistory, setShowHistory] = useState(false);
  const mainQuestTitle = useMemo(() => new Map(mainQuests.map((mq) => [mq.id, mq.title])), [mainQuests]);
  const visibleQuests = useMemo(
    () =>
      quests
        .filter((quest) => quest.type === activeType)
        .filter((quest) => showHistory || quest.status !== "completed")
        .filter((quest) => inScope(quest, timeScope))
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [activeType, quests, showHistory, timeScope],
  );

  return (
    <section className="quest-domain-screen">
      <header className="quest-domain-hero">
        <Badge tone="gold">Quest Domain</Badge>
        <h1>왕실 Quest</h1>
        <p>메인퀘스트(프로젝트)는 집무실에서 관리하고, 여기서는 서브·일일·반복·스토리 퀘스트를 실행합니다.</p>
        <div className="quest-hero-stats">
          <div><strong>{progress.todayProgress}%</strong><span>오늘 진행률</span></div>
          <div><strong>Lv.{progress.level}</strong><span>레벨</span></div>
          <div><strong>{progress.todayCompletedQuests}/{progress.todayTotalQuests}</strong><span>오늘 완료</span></div>
        </div>
        <ProgressBar value={progress.expRate} label="Quest EXP" />
      </header>

      <nav className="quest-tabs" aria-label="Quest types">
        {questTabs.map((type) => (
          <button key={type} type="button" className={activeType === type ? "active" : ""} onClick={() => setActiveType(type)}>
            <span>{questTypeMeta[type].icon}</span>
            <span>{questTypeMeta[type].label}</span>
          </button>
        ))}
      </nav>

      <nav className="quest-time-tabs" aria-label="Quest timeline">
        {timeTabs.map((tab) => (
          <button key={tab.key} type="button" className={timeScope === tab.key ? "active" : ""} onClick={() => setTimeScope(tab.key)}>
            {tab.label}
          </button>
        ))}
      </nav>

      {completionEvents.length > 0 && (
        <section className="quest-completion-flow" aria-label="Quest completion flow">
          {completionEvents.map((event) => <span key={event.type}>{event.label}</span>)}
        </section>
      )}

      <div className="quest-toolbar">
        <button type="button" onClick={() => setShowHistory((value) => !value)}>
          {showHistory ? "진행 Quest 보기" : "완료 보기 · 왕국도서관"}
        </button>
      </div>

      <div className="quest-list rpg">
        {visibleQuests.length === 0 ? (
          <article className="quest-empty">
            <strong>이 조건에 맞는 Quest가 없습니다.</strong>
            <span>종류 또는 시간축을 바꿔 이전/현재/이후 Quest를 확인하세요.</span>
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
              {quest.mainQuestId && mainQuestTitle.get(quest.mainQuestId) && (
                <span className="quest-chapter">{mainQuestTitle.get(quest.mainQuestId)}</span>
              )}
              <div className="quest-meta-row">
                <span>보상 {quest.rewardItem ?? `${quest.goldReward} Gold`}</span>
                <span>마감 {quest.dueDate}</span>
              </div>
              <ProgressBar value={quest.progress} label={`${quest.title} progress`} />
              <div className="quest-actions">
                <Button variant="glass" size="sm" onClick={() => onCycleQuest(quest.id)}>계속</Button>
                <Button
                  size="sm"
                  variant={quest.status === "completed" ? "glass" : "primary"}
                  onClick={() => onToggleQuest(quest.id, quest.status !== "completed")}
                >
                  {quest.status === "completed" ? "완료 취소" : "완료"}
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
              <strong>{item.completedAt.slice(0, 10)} · EXP +{item.rewardExp}</strong>
              <span>{item.note}</span>
            </article>
          ))}
        </section>
      )}
    </section>
  );
}
