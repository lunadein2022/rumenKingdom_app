import type { AppMockData } from "../../../app/types";
import { ProgressBar } from "../../../components/design-system/ProgressBar";
import { buildPrincessStats } from "../../princess/services/princessService";

interface ThronePageProps {
  data: AppMockData;
}

export function ThronePage({ data }: ThronePageProps) {
  const { princess, progress, titles, achievements, quests, mainQuests, diaryEntries, events, contacts, serinMessages } = data;
  const stats = buildPrincessStats(princess);
  const completedMainQuests = mainQuests.filter((mainQuest) => mainQuest.status === "completed").length;
  const inProgressMainQuests = mainQuests.filter((mainQuest) => mainQuest.status !== "completed").length;
  const completedQuests = quests.filter((quest) => quest.status === "completed").length;
  const unlockedAchievements = achievements.filter((achievement) => achievement.unlocked).length;
  const recentDecisions = [
    "Princess OS 2.0 개발 승인",
    "Hydro Hawk 글로벌 진출 결정",
    "조직 개편 및 팀 리더 임명",
    "세린과의 협업 강화",
  ];

  return (
    <section className="palace-scene throne-scene scene-fullbleed">
      <div className="palace-bg" style={{ backgroundImage: 'url("/assets/throne.webp")' }} />
      <div className="palace-vignette" />
      <img className="throne-princess" src="/assets/princess-full-final.png" alt="공주" />

      <header className="scene-title throne-title">
        <span>♕ 왕좌의 방 <em>Throne Room</em></span>
        <p>공주의 최종 결정과 선언이 이루어지는 곳입니다.</p>
      </header>

      <aside className="palace-panel throne-left-decision">
        <h2>공주의 선언</h2>
        <blockquote>나의 시간은 나의 선택으로 빛난다.<br />오늘도, 왕국은 한 걸음 성장한다.</blockquote>
        <h2>최근 결정</h2>
        {recentDecisions.map((decision, index) => (
          <p key={decision}><span>♕</span><strong>{decision}</strong><time>2026.07.{10 - index}</time></p>
        ))}
      </aside>

      <main className="palace-panel throne-growth-card ornamental-panel">
        <h2>왕국 성장 현황</h2>
        <div className="throne-growth-grid">
          <article><span>총 프로젝트</span><strong>{mainQuests.length}</strong><em>진행 중 {inProgressMainQuests}</em></article>
          <article><span>완료한 Quest</span><strong>{completedQuests.toLocaleString()}</strong><em>오늘 +{progress.todayCompletedQuests}</em></article>
          <article><span>획득한 EXP</span><strong>{progress.currentExp.toLocaleString()}</strong><em>Lv.{progress.level}</em></article>
          <article><span>왕국 기여도</span><strong>{Math.max(1, completedMainQuests + completedQuests)}</strong><em>전체 1위</em></article>
        </div>
        <div className="throne-exp-wide">
          <strong>Princess Lv.{progress.level}</strong>
          <span>{progress.currentExp.toLocaleString()} / {progress.requiredExp.toLocaleString()} EXP</span>
          <ProgressBar value={progress.expRate} label="Princess EXP" />
        </div>
      </main>

      <aside className="palace-panel throne-right-status">
        <h2>왕국의 주요 현황</h2>
        <div className="kingdom-map">♛</div>
        <p><span>루멘 왕국</span><strong>성장 등급 S</strong></p>
        <ProgressBar value={78} label="Kingdom growth" />
        <div className="status-row"><span>인력</span><strong>{contacts.length}</strong></div>
        <div className="status-row"><span>지식 자산</span><strong>{diaryEntries.length + serinMessages.length}</strong></div>
        <div className="status-row"><span>일정</span><strong>{events.length}</strong></div>
        <div className="status-row"><span>업적</span><strong>{unlockedAchievements}/{achievements.length}</strong></div>
      </aside>

      <section className="palace-panel throne-stats-ribbon">
        {Object.entries(stats).map(([key, value]) => <article key={key}><span>{key}</span><strong>{value}</strong></article>)}
        {titles.slice(0, 4).map((title) => <article key={title.key}><span>{title.equipped ? "장착 칭호" : "칭호"}</span><strong>{title.name}</strong></article>)}
      </section>
    </section>
  );
}
