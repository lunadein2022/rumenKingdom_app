import type { AppMockData, ViewKey } from "../../app/types";
import { Badge } from "../design-system/Badge";
import { Button } from "../design-system/Button";
import { ProgressBar } from "../design-system/ProgressBar";
import { PalaceRoomSection } from "./PalaceRoomSection";

interface HomeSceneProps {
  data: AppMockData;
  activeView: ViewKey;
  onNavigate: (view: ViewKey) => void;
}

export function HomeScene({ data, onNavigate }: HomeSceneProps) {
  return (
    <section className="home-screen">
      <header className="home-hero-mobile">
        <div className="home-hero-bg" />
        <div className="home-copy">
          <div className="home-kicker">
            <span>좋은 아침입니다</span>
            <span>루멘 왕성</span>
          </div>
          <h1>공주님, 오늘의 왕궁이 열렸습니다.</h1>
          <p>{data.serin.greetingText}</p>
        </div>

        <div className="home-character-row">
          <div className="home-character princess">
            <span>공주 · 주인공</span>
            <img src="/assets/princess-full-transparent.png" alt="공주 전신" />
          </div>
          <div className="home-character serin">
            <span>세린 · AI 보좌관</span>
            <img src="/assets/serin-full-transparent.png" alt="세린 전신" />
          </div>
        </div>
      </header>

      <section className="home-stat-grid" aria-label="오늘 요약">
        <button type="button" onClick={() => onNavigate("quests")}>
          <Badge tone="royal">Quest</Badge>
          <strong>{data.progress.todayCompletedQuests}/{data.progress.todayTotalQuests}</strong>
          <span>오늘 퀘스트</span>
        </button>
        <button type="button" onClick={() => onNavigate("calendar")}>
          <Badge tone="royal">Calendar</Badge>
          <strong>{data.events.length}</strong>
          <span>오늘 일정</span>
        </button>
        <button type="button" onClick={() => onNavigate("progress")}>
          <Badge tone="gold">Level</Badge>
          <strong>Lv.{data.progress.level}</strong>
          <span>{data.progress.expRate}% EXP</span>
        </button>
      </section>

      <section className="home-progress-card">
        <div>
          <strong>Princess EXP</strong>
          <span>{data.progress.currentExp.toLocaleString()} / {data.progress.requiredExp.toLocaleString()}</span>
        </div>
        <ProgressBar value={data.progress.expRate} label="Princess EXP" />
      </section>

      <section className="home-action-row">
        <Button onClick={() => onNavigate("quests")}>오늘 퀘스트 시작</Button>
        <Button variant="glass" onClick={() => onNavigate("serin")}>세린에게 묻기</Button>
      </section>

      <section className="mobile-section-heading">
        <h2>왕궁 탐험</h2>
        <p>정원, 도서관, 집무실, 침실, 왕좌의 방으로 하루를 이동합니다.</p>
      </section>
      <PalaceRoomSection rooms={data.rooms} onNavigate={onNavigate} />
    </section>
  );
}
