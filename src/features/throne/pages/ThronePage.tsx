import type { AppMockData } from "../../../app/types";
import { Badge } from "../../../components/design-system/Badge";
import { ProgressBar } from "../../../components/design-system/ProgressBar";
import { buildPrincessStats } from "../../princess/services/princessService";

interface ThronePageProps {
  data: AppMockData;
}

// Throne(왕좌의 방) = 성장 화면입니다. 레벨/EXP/칭호/업적/보상과 누적 성과
// 통계를 보여줍니다. 해금(unlock) 시스템은 없습니다 — 이 화면은 방을 여는
// 곳이 아니라, 지금까지의 성장을 확인하는 곳입니다.
export function ThronePage({ data }: ThronePageProps) {
  const { princess, progress, titles, achievements, quests, mainQuests, diaryEntries, events, contacts, serinMessages } = data;
  const stats = buildPrincessStats(princess);
  const completedMainQuests = mainQuests.filter((mainQuest) => mainQuest.status === "completed").length;
  const inProgressMainQuests = mainQuests.filter((mainQuest) => mainQuest.status !== "completed").length;
  const completedQuests = quests.filter((quest) => quest.status === "completed").length;
  const totalQuests = quests.length;
  const questCompletionRate = totalQuests === 0 ? 0 : Math.round((completedQuests / totalQuests) * 100);
  const completedMeetings = events.filter((event) => event.category === "meeting" && event.status === "completed").length;
  const totalEvents = events.filter((event) => event.status !== "cancelled").length;
  const diaryDays = diaryEntries.length;
  const relationshipCount = contacts.length;
  const serinConversations = serinMessages.filter((message) => message.sender === "princess").length;

  return (
    <section className="throne-domain-page scene-fullbleed">
      <div className="throne-scene-backdrop" style={{ backgroundImage: 'url("/assets/throne.webp")' }} />
      <img className="scene-center-princess" src="/assets/princess-full-transparent.webp" alt="공주" />
      <div className="throne-scene-content">
      <header className="throne-hero">
        <div>
          <Badge tone="gold">{princess.activeTitle}</Badge>
          <h1>{princess.displayName} Lv.{progress.level}</h1>
          <p>퀘스트, 메인퀘스트, 다이어리, 미팅은 모두 이곳 왕좌의 방에서 성장으로 이어집니다.</p>
        </div>
      </header>

      <section className="throne-exp-card">
        <div>
          <strong>Lv.{progress.level}</strong>
          <span>{progress.currentExp.toLocaleString()} / {progress.requiredExp.toLocaleString()} EXP</span>
        </div>
        <ProgressBar value={progress.expRate} label="Princess EXP" />
      </section>

      <section className="throne-stat-grid">
        <article><strong>{completedMainQuests}</strong><span>완료 프로젝트</span></article>
        <article><strong>{inProgressMainQuests}</strong><span>진행 중 프로젝트</span></article>
        <article><strong>{completedQuests}</strong><span>완료 퀘스트</span></article>
        <article><strong>{questCompletionRate}%</strong><span>퀘스트 완료율</span></article>
        <article><strong>{diaryDays}일</strong><span>다이어리 작성일</span></article>
        <article><strong>{completedMeetings}</strong><span>완료 미팅</span></article>
        <article><strong>{totalEvents}</strong><span>등록된 일정</span></article>
        <article><strong>{relationshipCount}</strong><span>인연록 등록</span></article>
        <article><strong>{serinConversations}</strong><span>세린과의 대화</span></article>
        <article><strong>{progress.streakDays}일</strong><span>연속 수행</span></article>
        <article><strong>{progress.pendingRewards}</strong><span>대기 보상</span></article>
        <article><strong>{achievements.filter((achievement) => achievement.unlocked).length}/{achievements.length}</strong><span>업적 달성</span></article>
      </section>

      <section className="throne-titles">
        <h2>칭호</h2>
        <div className="throne-title-row">
          {titles.map((title) => (
            <span key={title.key} className={title.equipped ? "equipped" : title.unlocked ? "unlocked" : "locked"}>
              {title.name}
            </span>
          ))}
        </div>
      </section>

      <section className="throne-achievements">
        <h2>업적</h2>
        {achievements.map((achievement) => (
          <article key={achievement.id} className={achievement.unlocked ? "unlocked" : ""}>
            <strong>{achievement.title}</strong>
            <span>{achievement.description}</span>
            <em>+{achievement.expReward} EXP</em>
          </article>
        ))}
      </section>

      <section className="throne-stat-list">
        <h2>능력치</h2>
        {Object.entries(stats).map(([key, value]) => (
          <article key={key}>
            <strong>{key}</strong>
            <span>{value}</span>
          </article>
        ))}
      </section>

      <section className="throne-equipment-list">
        <h2>착용 장비</h2>
        {princess.equippedItems.map((item) => (
          <article key={item.slot}>
            <strong>{item.slot}</strong>
            <span>{item.name}</span>
          </article>
        ))}
      </section>
      </div>
    </section>
  );
}
