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
  onToggleChapter: (mainQuestId: string, chapterId: string) => void;
  onAddUpdate: (mainQuestId: string, content: string) => void;
}

// 집무실 탭: 일일(오늘 할 일) / 서브(며칠~몇 주 업무) / 메인(장기 프로젝트).
type OfficeTab = QuestType | "main";

const officeTabs: Array<{ key: OfficeTab; label: string; hint: string }> = [
  { key: "daily", label: "일일 Quest", hint: "오늘 해야 할 일" },
  { key: "side", label: "서브 Quest", hint: "중기 업무 / 진행 중 업무" },
  { key: "main", label: "메인 Quest (프로젝트)", hint: "장기 프로젝트 관리" },
];

const mainStatusLabel: Record<MainQuest["status"], string> = {
  active: "진행 중",
  onHold: "보류",
  completed: "완료",
};

function statusText(status: Quest["status"]) {
  if (status === "completed") return "완료";
  return "진행 중";
}

// 집무실 = Princess OS의 핵심 공간. "퀘스트를 하러 간다"가 아니라 "프로젝트를
// 진행한다"는 사고 흐름에 맞춰, 메인(프로젝트) → 서브 → 일일 계층을 한 화면의
// 탭으로 관리합니다. 일일/서브는 퀘스트 저널(좌 목록 + 우 상세), 메인은
// 프로젝트 관리(좌 프로젝트 목록 + 우 챕터/업데이트/진행률) 형태입니다.
export function QuestScreen({
  quests,
  mainQuests,
  onToggleQuest,
  onDeleteQuest,
  onAskSerin,
  onToggleChapter,
  onAddUpdate,
}: QuestScreenProps) {
  const today = getKoreanToday();
  const [tab, setTab] = useState<OfficeTab>("daily");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedMainId, setSelectedMainId] = useState<string | null>(null);
  const [updateDraft, setUpdateDraft] = useState("");

  const mainQuestTitle = useMemo(() => new Map(mainQuests.map((mq) => [mq.id, mq.title])), [mainQuests]);
  const filtered = useMemo(
    () =>
      quests
        .filter((quest) => tab !== "main" && quest.type === tab)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [quests, tab],
  );
  const activeQuests = filtered.filter((quest) => quest.status !== "completed");
  const completedQuests = filtered.filter((quest) => quest.status === "completed");
  const selected = filtered.find((quest) => quest.id === selectedId) ?? activeQuests[0] ?? completedQuests[0] ?? null;
  const selectedMain = mainQuests.find((mq) => mq.id === selectedMainId) ?? mainQuests[0] ?? null;

  function submitUpdate() {
    if (!selectedMain || !updateDraft.trim()) return;
    onAddUpdate(selectedMain.id, updateDraft.trim());
    setUpdateDraft("");
  }

  return (
    <section className="quest-journal-scene scene-fullbleed">
      <div className="quest-journal-backdrop" style={{ backgroundImage: 'url("/assets/office.webp")' }} />

      <img className="quest-journal-princess" src="/assets/princess-full-transparent.webp" alt="공주" />

      <aside className="game-panel quest-log-panel">
        <h2 className="game-panel-title">집무실</h2>

        <nav className="game-tabs office-tabs" aria-label="집무실 탭">
          {officeTabs.map((item) => (
            <button
              key={item.key}
              type="button"
              className={tab === item.key ? "active" : ""}
              title={item.hint}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {tab !== "main" ? (
          <div className="quest-log-scroll">
            <div className="quest-log-section">
              <h3>
                진행 중 <em>{activeQuests.length}</em>
              </h3>
              {activeQuests.length === 0 ? (
                <p className="quest-log-empty">
                  진행 중인 {questTypeMeta[tab].label} 퀘스트가 없습니다.
                  <br />
                  세린에게 "{tab === "daily" ? "일일" : "서브"}에 추가해줘"라고 말해보세요.
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
          </div>
        ) : (
          <div className="quest-log-scroll">
            <div className="quest-log-section">
              <h3>
                메인 프로젝트 <em>{mainQuests.length}</em>
              </h3>
              {mainQuests.length === 0 ? (
                <p className="quest-log-empty">
                  진행 중인 메인 퀘스트가 없습니다.
                  <br />
                  세린에게 "메인에 추가해줘"라고 말해보세요.
                </p>
              ) : (
                <ul className="quest-log-list main-quest-list">
                  {mainQuests.map((mq) => (
                    <li key={mq.id}>
                      <button
                        type="button"
                        className={mq.id === selectedMain?.id ? "active" : ""}
                        onClick={() => setSelectedMainId(mq.id)}
                      >
                        <span className="quest-log-icon">♛</span>
                        <span className="quest-log-copy">
                          <strong>{mq.title}</strong>
                          <span className="main-quest-progress-track">
                            <span style={{ width: `${Math.min(100, mq.progress)}%` }} />
                          </span>
                          <small>
                            진행률 {mq.progress}% · {mainStatusLabel[mq.status]}
                          </small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <button type="button" className="game-panel-cta" onClick={onAskSerin}>
          ✦ 퀘스트 추가 — 세린에게 말하기
        </button>
      </aside>

      <aside className="game-panel quest-detail-panel">
        {tab !== "main" ? (
          <>
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
          </>
        ) : (
          <>
            <h2 className="game-panel-title">프로젝트 상세</h2>
            {!selectedMain ? (
              <div className="quest-detail-empty">
                <p>
                  메인 퀘스트가 없습니다.
                  <br />
                  세린에게 "메인에 추가해줘"라고 말해보세요.
                </p>
                <button type="button" className="game-panel-cta" onClick={onAskSerin}>
                  세린과 대화하기
                </button>
              </div>
            ) : (
              <div className="main-quest-detail-scroll">
                <h3 className="quest-detail-title">{selectedMain.title}</h3>
                <span className="quest-detail-type">메인 퀘스트 · {mainStatusLabel[selectedMain.status]}</span>

                <dl className="quest-detail-meta">
                  <div>
                    <dt>기간</dt>
                    <dd>
                      {formatKoreanDateShort(selectedMain.startDate)} ~ {formatKoreanDateShort(selectedMain.dueDate)}
                    </dd>
                  </div>
                  <div>
                    <dt>챕터</dt>
                    <dd>
                      {selectedMain.chapters.filter((chapter) => chapter.done).length}/{selectedMain.chapters.length} 완료
                    </dd>
                  </div>
                </dl>

                {selectedMain.description && <p className="quest-detail-desc">{selectedMain.description}</p>}

                <div className="quest-detail-progress">
                  <span>진행률</span>
                  <div className="quest-detail-progress-track">
                    <div style={{ width: `${Math.min(100, selectedMain.progress)}%` }} />
                  </div>
                  <em>{selectedMain.progress}%</em>
                </div>

                <div className="main-quest-chapters">
                  <h4>챕터</h4>
                  {selectedMain.chapters.length === 0 ? (
                    <p className="quest-log-empty">아직 챕터가 없습니다. 아래 업데이트 로그로 진행 내용을 남겨보세요.</p>
                  ) : (
                    <ul>
                      {selectedMain.chapters.map((chapter) => (
                        <li key={chapter.id}>
                          <button
                            type="button"
                            className={chapter.done ? "done" : ""}
                            onClick={() => onToggleChapter(selectedMain.id, chapter.id)}
                          >
                            <span className="quest-log-icon">{chapter.done ? "✓" : ""}</span>
                            <span>{chapter.title}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="main-quest-updates">
                  <h4>업데이트 로그</h4>
                  <div className="main-quest-update-form">
                    <input
                      type="text"
                      value={updateDraft}
                      placeholder="진행 내용을 기록하세요"
                      onChange={(event) => setUpdateDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") submitUpdate();
                      }}
                    />
                    <button type="button" className="game-button" onClick={submitUpdate}>
                      기록
                    </button>
                  </div>
                  {selectedMain.updates.length === 0 ? (
                    <p className="quest-log-empty">아직 기록된 업데이트가 없습니다.</p>
                  ) : (
                    <ul>
                      {selectedMain.updates.slice(0, 8).map((update) => (
                        <li key={update.id}>
                          <small>
                            {update.date.slice(0, 10)} · {update.author === "serin" ? "세린" : "공주"}
                          </small>
                          <p>{update.content}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </aside>
    </section>
  );
}
