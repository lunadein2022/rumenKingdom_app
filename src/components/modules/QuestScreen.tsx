import { type FormEvent, useMemo, useState } from "react";
import type { MainQuest, Quest, QuestType } from "../../app/types";
import { formatKoreanDateShort, getKoreanToday } from "../../app/dateUtils";
import { questTypeMeta } from "../../domain/questDomain";

interface QuestScreenProps {
  quests: Quest[];
  mainQuests: MainQuest[];
  onToggleQuest: (id: string, completed: boolean) => void;
  onDeleteQuest: (id: string) => void;
  onCreateQuest: (input: { title: string; description?: string; type: "daily" | "side"; dueDate: string }) => void;
  onUpdateQuest: (id: string, changes: Partial<Quest>) => void;
  onAskSerin: () => void;
  onToggleChapter: (mainQuestId: string, chapterId: string) => void;
  onAddUpdate: (mainQuestId: string, content: string) => void;
}

type OfficeTab = QuestType | "main";

const officeTabs: Array<{ key: OfficeTab; label: string }> = [
  { key: "daily", label: "일일 Quest" },
  { key: "side", label: "서브 Quest" },
  { key: "main", label: "메인 Quest" },
];

const mainStatusLabel: Record<MainQuest["status"], string> = {
  active: "진행 중",
  onHold: "보류",
  completed: "완료",
};

function statusText(status: Quest["status"]) {
  if (status === "completed") return "완료";
  if (status === "inProgress") return "진행 중";
  return "대기";
}

export function QuestScreen({
  quests,
  mainQuests,
  onToggleQuest,
  onDeleteQuest,
  onCreateQuest,
  onUpdateQuest,
  onAskSerin,
  onToggleChapter,
  onAddUpdate,
}: QuestScreenProps) {
  const today = getKoreanToday();
  const [tab, setTab] = useState<OfficeTab>("daily");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedMainId, setSelectedMainId] = useState<string | null>(null);
  const [updateDraft, setUpdateDraft] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftDueDate, setDraftDueDate] = useState(today);
  const [draftType, setDraftType] = useState<"daily" | "side">("daily");

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

  function openEdit(quest: Quest) {
    setDraftTitle(quest.title);
    setDraftDescription(quest.description);
    setDraftDueDate(quest.dueDate);
    setDraftType(quest.type);
    setEditMode(true);
  }

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftTitle.trim()) return;
    onCreateQuest({
      title: draftTitle.trim(),
      description: draftDescription.trim(),
      type: draftType,
      dueDate: draftDueDate,
    });
    setDraftTitle("");
    setDraftDescription("");
    setDraftDueDate(today);
    setDraftType("daily");
    setShowCreate(false);
  }

  function saveEdit() {
    if (!selected || !draftTitle.trim()) return;
    onUpdateQuest(selected.id, {
      title: draftTitle.trim(),
      description: draftDescription,
      dueDate: draftDueDate,
      type: draftType,
    });
    setEditMode(false);
  }

  function submitUpdate() {
    if (!selectedMain || !updateDraft.trim()) return;
    onAddUpdate(selectedMain.id, updateDraft.trim());
    setUpdateDraft("");
  }

  return (
    <section className="quest-journal-scene scene-fullbleed">
      <div className="quest-journal-backdrop" style={{ backgroundImage: 'url("/assets/office.webp")' }} />
      <img className="quest-journal-princess" src="/assets/princess-full-final.png" alt="공주" />

      <aside className="game-panel quest-log-panel">
        <h2 className="game-panel-title">집무실</h2>

        <nav className="game-tabs office-tabs" aria-label="집무실 분류">
          {officeTabs.map((item) => (
            <button key={item.key} type="button" className={tab === item.key ? "active" : ""} onClick={() => setTab(item.key)}>
              {item.label}
            </button>
          ))}
        </nav>

        {tab !== "main" && (
          <button type="button" className="game-panel-cta" onClick={() => setShowCreate((value) => !value)}>
            {showCreate ? "입력 닫기" : "직접 Quest 추가"}
          </button>
        )}

        {showCreate && tab !== "main" && (
          <form className="quest-inline-form" onSubmit={submitCreate}>
            <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="Quest 제목" />
            <textarea value={draftDescription} onChange={(event) => setDraftDescription(event.target.value)} placeholder="설명" />
            <div className="calendar-form-grid">
              <select value={draftType} onChange={(event) => setDraftType(event.target.value as "daily" | "side")}>
                <option value="daily">일일 Quest</option>
                <option value="side">서브 Quest</option>
              </select>
              <input type="date" value={draftDueDate} onChange={(event) => setDraftDueDate(event.target.value)} />
            </div>
            <button type="submit" className="game-button primary">추가</button>
          </form>
        )}

        {tab !== "main" ? (
          <div className="quest-log-scroll">
            <div className="quest-log-section">
              <h3>진행 중 <em>{activeQuests.length}</em></h3>
              {activeQuests.length === 0 ? (
                <p className="quest-log-empty">진행 중인 {questTypeMeta[tab].label} Quest가 없습니다.</p>
              ) : (
                <ul className="quest-log-list">
                  {activeQuests.map((quest) => (
                    <li key={quest.id}>
                      <button type="button" className={quest.id === selected?.id ? "active" : ""} onClick={() => setSelectedId(quest.id)}>
                        <span className="quest-log-icon">□</span>
                        <span className="quest-log-copy">
                          <strong>{quest.title}</strong>
                          <small>마감 {formatKoreanDateShort(quest.dueDate)}{quest.dueDate === today ? " (오늘)" : ""}</small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="quest-log-section">
              <h3>완료 <em>{completedQuests.length}</em></h3>
              {completedQuests.length === 0 ? (
                <p className="quest-log-empty">완료된 Quest가 없습니다.</p>
              ) : (
                <ul className="quest-log-list completed">
                  {completedQuests.map((quest) => (
                    <li key={quest.id}>
                      <button type="button" className={quest.id === selected?.id ? "active" : ""} onClick={() => setSelectedId(quest.id)}>
                        <span className="quest-log-icon">✓</span>
                        <span className="quest-log-copy"><strong>{quest.title}</strong></span>
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
              <h3>메인 Quest <em>{mainQuests.length}</em></h3>
              {mainQuests.length === 0 ? (
                <p className="quest-log-empty">진행 중인 메인 Quest가 없습니다.</p>
              ) : (
                <ul className="quest-log-list main-quest-list">
                  {mainQuests.map((mq) => (
                    <li key={mq.id}>
                      <button type="button" className={mq.id === selectedMain?.id ? "active" : ""} onClick={() => setSelectedMainId(mq.id)}>
                        <span className="quest-log-icon">♛</span>
                        <span className="quest-log-copy">
                          <strong>{mq.title}</strong>
                          <span className="main-quest-progress-track"><span style={{ width: `${Math.min(100, mq.progress)}%` }} /></span>
                          <small>{mq.progress}% · {mainStatusLabel[mq.status]}</small>
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
          세린에게 말하기
        </button>
      </aside>

      <aside className="game-panel quest-detail-panel">
        {tab !== "main" ? (
          <>
            <h2 className="game-panel-title">Quest 상세</h2>
            {!selected ? (
              <div className="quest-detail-empty">
                <p>Quest가 없습니다. 직접 추가하거나 세린에게 말해보세요.</p>
              </div>
            ) : editMode ? (
              <div className="quest-inline-form">
                <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} />
                <textarea value={draftDescription} onChange={(event) => setDraftDescription(event.target.value)} />
                <div className="calendar-form-grid">
                  <select value={draftType} onChange={(event) => setDraftType(event.target.value as "daily" | "side")}>
                    <option value="daily">일일 Quest</option>
                    <option value="side">서브 Quest</option>
                  </select>
                  <input type="date" value={draftDueDate} onChange={(event) => setDraftDueDate(event.target.value)} />
                </div>
                <div className="quest-detail-actions">
                  <button type="button" className="game-button" onClick={() => setEditMode(false)}>취소</button>
                  <button type="button" className="game-button primary" onClick={saveEdit}>저장</button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="quest-detail-title">{selected.title}</h3>
                <span className="quest-detail-type">{questTypeMeta[selected.type].label} Quest</span>
                <dl className="quest-detail-meta">
                  <div><dt>상태</dt><dd>{statusText(selected.status)}</dd></div>
                  <div><dt>마감</dt><dd>{formatKoreanDateShort(selected.dueDate)}{selected.dueDate === today ? " (오늘)" : ""}</dd></div>
                  <div><dt>보상</dt><dd>EXP +{selected.expReward}</dd></div>
                  {selected.mainQuestId && mainQuestTitle.get(selected.mainQuestId) && (
                    <div><dt>프로젝트</dt><dd>{mainQuestTitle.get(selected.mainQuestId)}</dd></div>
                  )}
                </dl>
                {selected.description && <p className="quest-detail-desc">{selected.description}</p>}
                <div className="quest-detail-progress">
                  <span>진행률</span>
                  <div className="quest-detail-progress-track"><div style={{ width: `${selected.progress}%` }} /></div>
                  <em>{selected.progress}%</em>
                </div>
                <div className="quest-detail-actions">
                  <button type="button" className="game-button" onClick={() => openEdit(selected)}>수정</button>
                  <button type="button" className="game-button primary" onClick={() => onToggleQuest(selected.id, selected.status !== "completed")}>
                    {selected.status === "completed" ? "완료 취소" : "완료 처리"}
                  </button>
                  <button type="button" className="game-button danger" onClick={() => onDeleteQuest(selected.id)}>삭제</button>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <h2 className="game-panel-title">프로젝트 상세</h2>
            {!selectedMain ? (
              <div className="quest-detail-empty"><p>메인 Quest가 없습니다.</p></div>
            ) : (
              <div className="main-quest-detail-scroll">
                <h3 className="quest-detail-title">{selectedMain.title}</h3>
                <span className="quest-detail-type">메인 Quest · {mainStatusLabel[selectedMain.status]}</span>
                <dl className="quest-detail-meta">
                  <div><dt>기간</dt><dd>{formatKoreanDateShort(selectedMain.startDate)} ~ {formatKoreanDateShort(selectedMain.dueDate)}</dd></div>
                  <div><dt>챕터</dt><dd>{selectedMain.chapters.filter((chapter) => chapter.done).length}/{selectedMain.chapters.length} 완료</dd></div>
                </dl>
                {selectedMain.description && <p className="quest-detail-desc">{selectedMain.description}</p>}
                <div className="quest-detail-progress">
                  <span>진행률</span>
                  <div className="quest-detail-progress-track"><div style={{ width: `${Math.min(100, selectedMain.progress)}%` }} /></div>
                  <em>{selectedMain.progress}%</em>
                </div>
                <div className="main-quest-chapters">
                  <h4>챕터</h4>
                  {selectedMain.chapters.map((chapter) => (
                    <label key={chapter.id} className="calendar-check-row">
                      <input type="checkbox" checked={chapter.done} onChange={() => onToggleChapter(selectedMain.id, chapter.id)} />
                      <span>{chapter.title}</span>
                    </label>
                  ))}
                </div>
                <div className="main-quest-update-box">
                  <textarea value={updateDraft} onChange={(event) => setUpdateDraft(event.target.value)} placeholder="업데이트 로그를 남기세요" />
                  <button type="button" className="game-button primary" onClick={submitUpdate}>업데이트 추가</button>
                </div>
              </div>
            )}
          </>
        )}
      </aside>
    </section>
  );
}
