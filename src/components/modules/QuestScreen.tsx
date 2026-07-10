import { useMemo, useState } from "react";
import type { MainQuest, Quest, QuestType } from "../../app/types";
import { formatKoreanDateShort, getKoreanToday } from "../../app/dateUtils";
import { questTypeMeta } from "../../domain/questDomain";

interface QuestScreenProps {
  quests: Quest[];
  mainQuests: MainQuest[];
  onToggleQuest: (id: string, completed: boolean) => void;
  onDeleteQuest: (id: string) => void;
  onAskSerin: () => void;
}

type QuestTypeFilter = "all" | QuestType;

const typeTabs: Array<{ key: QuestTypeFilter; label: string }> = [
  { key: "all", label: "전체" },
  { key: "daily", label: "일일" },
  { key: "routine", label: "반복" },
  { key: "side", label: "서브" },
  { key: "story", label: "스토리" },
];

function statusText(status: Quest["status"]) {
  if (status === "completed") return "완료";
  if (status === "inProgress") return "진행 중";
  return "진행 중";
}

// Quest 화면 = 카드 나열이 아니라 RPG 퀘스트 저널입니다.
// 왼쪽: 퀘스트 로그(진행 중 / 완료 목록), 중앙: 배경과 공주 캐릭터,
// 오른쪽: 선택한 퀘스트의 상세와 완료/삭제 액션.
// 초기 데이터가 없으면 "세린에게 말해보세요" 빈 상태를 보여줍니다.
export function QuestScreen({ quests, mainQuests, onToggleQuest, onDeleteQuest, onAskSerin }: QuestScreenProps) {
  const today = getKoreanToday();
  const [typeFilter, setTypeFilter] = useState<QuestTypeFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const mainQuestTitle = useMemo(() => new Map(mainQuests.map((mq) => [mq.id, mq.title])), [mainQuests]);
  const filtered = useMemo(
    () =>
      quests
        .filter((quest) => typeFilter === "all" || quest.type === typeFilter)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [quests, typeFilter],
  );
  const activeQuests = filtered.filter((quest) => quest.status !== "completed");
  const completedQuests = filtered.filter((quest) => quest.status === "completed");
  const selected = filtered.find((quest) => quest.id === selectedId) ?? activeQuests[0] ?? completedQuests[0] ?? null;

  return (
    <section className="quest-journal-scene scene-fullbleed">
      <div className="quest-journal-backdrop" style={{ backgroundImage: 'url("/assets/throne.webp")' }} />

      <img className="quest-journal-princess" src="/assets/princess-full-transparent.webp" alt="공주" />

      <aside className="game-panel quest-log-panel">
        <h2 className="game-panel-title">퀘스트 로그</h2>

        <nav className="game-tabs" aria-label="퀘스트 종류">
          {typeTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={typeFilter === tab.key ? "active" : ""}
              onClick={() => setTypeFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="quest-log-section">
          <h3>
            진행 중 <em>{activeQuests.length}</em>
          </h3>
          {activeQuests.length === 0 ? (
            <p className="quest-log-empty">
              진행 중인 퀘스트가 없습니다.
              <br />
              세린에게 해야 할 일을 말해보세요.
            </p>
          ) : (
            <ul className="quest-log-list">
              {activeQuests.map((quest) => (
                <li key={quest.id}>
                  <button
                    type="button"
                    className={quest.id === selected?.id ? "active" : ""}
                    onClick={() => setSelectedId(quest.id)}
                  >
                    <span className="quest-log-icon">✦</span>
                    <span className="quest-log-copy">
                      <strong>{quest.title}</strong>
                      <small>
                        마감일 {formatKoreanDateShort(quest.dueDate)}
                        {quest.dueDate === today ? " (오늘)" : ""}
                      </small>
                    </span>
                    <em className="quest-log-type">{questTypeMeta[quest.type].label}</em>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="quest-log-section">
          <h3>
            완료된 퀘스트 <em>{completedQuests.length}</em>
          </h3>
          {completedQuests.length === 0 ? (
            <p className="quest-log-empty">표시할 완료된 퀘스트가 없습니다.</p>
          ) : (
            <ul className="quest-log-list completed">
              {completedQuests.map((quest) => (
                <li key={quest.id}>
                  <button
                    type="button"
                    className={quest.id === selected?.id ? "active" : ""}
                    onClick={() => setSelectedId(quest.id)}
                  >
                    <span className="quest-log-icon">✓</span>
                    <span className="quest-log-copy">
                      <strong>{quest.title}</strong>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button type="button" className="game-panel-cta" onClick={onAskSerin}>
          ✦ 퀘스트 추가 — 세린에게 말하기
        </button>
      </aside>

      <aside className="game-panel quest-detail-panel">
        <h2 className="game-panel-title">퀘스트 상세</h2>

        {!selected ? (
          <div className="quest-detail-empty">
            <p>
              퀘스트가 없습니다.
              <br />
              세린에게 해야 할 일을 말해보세요.
            </p>
            <button type="button" className="game-panel-cta" onClick={onAskSerin}>
              세린과 대화하기
            </button>
          </div>
        ) : (
          <>
            <h3 className="quest-detail-title">{selected.title}</h3>
            <span className="quest-detail-type">{questTypeMeta[selected.type].label} 퀘스트</span>

            <dl className="quest-detail-meta">
              <div>
                <dt>상태</dt>
                <dd>{statusText(selected.status)}</dd>
              </div>
              <div>
                <dt>마감일</dt>
                <dd>
                  {formatKoreanDateShort(selected.dueDate)}
                  {selected.dueDate === today ? " (오늘)" : ""}
                </dd>
              </div>
              <div>
                <dt>보상</dt>
                <dd>EXP +{selected.expReward}</dd>
              </div>
              {selected.mainQuestId && mainQuestTitle.get(selected.mainQuestId) && (
                <div>
                  <dt>프로젝트</dt>
                  <dd>{mainQuestTitle.get(selected.mainQuestId)}</dd>
                </div>
              )}
            </dl>

            {selected.description && <p className="quest-detail-desc">{selected.description}</p>}

            <div className="quest-detail-progress">
              <span>진행도</span>
              <div className="quest-detail-progress-track">
                <div style={{ width: `${selected.progress}%` }} />
              </div>
              <em>{selected.progress}%</em>
            </div>

            <div className="quest-detail-actions">
              <button
                type="button"
                className="game-button primary"
                onClick={() => onToggleQuest(selected.id, selected.status !== "completed")}
              >
                {selected.status === "completed" ? "완료 취소" : "✓ 완료 처리"}
              </button>
              <button type="button" className="game-button danger" onClick={() => onDeleteQuest(selected.id)}>
                삭제
              </button>
            </div>
          </>
        )}
      </aside>
    </section>
  );
}
