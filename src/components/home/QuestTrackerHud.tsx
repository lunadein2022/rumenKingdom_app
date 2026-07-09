import { useState } from "react";
import type { Quest } from "../../app/types";

interface QuestTrackerHudProps {
  quests: Quest[];
  todayDate: string;
  onCompleteQuest: (id: string) => void;
}

const CELEBRATE_LINES = [
  "잘하셨어요, 공주님! 이 기세로 계속 가봐요.",
  "역시 공주님이세요. 하나 더 가벼워지셨네요.",
  "훌륭해요, 공주님. 제가 옆에서 계속 챙길게요.",
  "완료 축하드려요, 공주님. 다음 것도 함께 해요.",
];

function pickCelebrateLine() {
  return CELEBRATE_LINES[Math.floor(Math.random() * CELEBRATE_LINES.length)];
}

// 우측 Edge에 고정되는 RPG풍 Quest Tracker. 카드 목록이 아니라 얇은 HUD 패널이며,
// 완료 시 체크 + Glow + EXP 획득 연출 + 세린의 짧은 축하 대사가 함께 표시됩니다.
export function QuestTrackerHud({ quests, todayDate, onCompleteQuest }: QuestTrackerHudProps) {
  const [celebrating, setCelebrating] = useState<{ id: string; line: string } | null>(null);

  const mainQuest = quests.find((quest) => quest.type === "main" && quest.status !== "completed");
  const todayQuests = quests
    .filter((quest) => quest.type !== "main")
    .filter((quest) => quest.dueDate === todayDate)
    .slice(0, 4);

  function handleComplete(quest: Quest) {
    if (quest.status === "completed") return;
    onCompleteQuest(quest.id);
    const line = pickCelebrateLine();
    setCelebrating({ id: quest.id, line });
    window.setTimeout(() => {
      setCelebrating((current) => (current?.id === quest.id ? null : current));
    }, 1600);
  }

  if (!mainQuest && todayQuests.length === 0) return null;

  return (
    <aside className="quest-tracker-hud" aria-label="Quest Tracker">
      {mainQuest && (
        <div className="tracker-main">
          <span className="tracker-eyebrow">Main Quest</span>
          <strong>{mainQuest.title}</strong>
          <div className="tracker-bar">
            <div className="tracker-bar-fill" style={{ width: `${Math.min(100, mainQuest.progress)}%` }} />
          </div>
        </div>
      )}

      {todayQuests.length > 0 && (
        <div className="tracker-daily">
          <span className="tracker-eyebrow">오늘 Quest</span>
          <ul>
            {todayQuests.map((quest) => {
              const isDone = quest.status === "completed";
              const isCelebrating = celebrating?.id === quest.id;
              return (
                <li key={quest.id} className={isCelebrating ? "celebrating" : ""}>
                  <button
                    type="button"
                    className={`tracker-item${isDone ? " done" : ""}`}
                    onClick={() => handleComplete(quest)}
                    disabled={isDone}
                  >
                    <span className="tracker-check">{isDone ? "✓" : ""}</span>
                    <span className="tracker-title">{quest.title}</span>
                  </button>
                  {isCelebrating && (
                    <div className="tracker-celebrate">
                      <span className="tracker-exp-pop">+{quest.expReward} EXP</span>
                      <p className="tracker-serin-line">{celebrating.line}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </aside>
  );
}
