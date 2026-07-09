import { useMemo, useState } from "react";
import type { CalendarEvent, Quest } from "../../../app/types";

interface BedroomPageProps {
  events: CalendarEvent[];
  quests: Quest[];
}

const today = new Date().toISOString().slice(0, 10);

export function BedroomPage({ events, quests }: BedroomPageProps) {
  const completedToday = quests.filter((quest) => quest.completedAt?.slice(0, 10) === today);
  const todayEvents = events.filter((event) => event.startAt.slice(0, 10) === today);
  const draft = useMemo(() => {
    const eventLine = todayEvents.length > 0
      ? `오늘 일정 ${todayEvents.length}개를 지나왔습니다.`
      : "오늘은 일정이 많지 않아 조금 더 조용한 하루였습니다.";
    const questLine = completedToday.length > 0
      ? `완료한 Quest는 ${completedToday.length}개입니다.`
      : "아직 완료한 Quest는 없지만, 하루를 정리할 시간은 충분합니다.";
    return `${eventLine}\n${questLine}\n내일의 공주님께 남기고 싶은 말을 적어주세요.`;
  }, [completedToday.length, todayEvents.length]);
  const [diary, setDiary] = useState(draft);
  const [saved, setSaved] = useState(false);

  function saveDiary() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  return (
    <section className="website-scene bedroom-scene">
      <div className="scene-shade" />
      <header className="scene-title-block">
        <span>Bedroom</span>
        <h1>공주의 침실</h1>
        <p>오늘의 일정과 완료 Quest를 바탕으로 하루를 조용히 정리합니다.</p>
      </header>

      <div className="bedroom-diary-hud">
        <div className="diary-summary-row">
          <span>오늘 일정 {todayEvents.length}개</span>
          <span>완료 Quest {completedToday.length}개</span>
        </div>
        <label>
          <span>오늘의 일기</span>
          <textarea value={diary} onChange={(event) => setDiary(event.target.value)} />
        </label>
        <button type="button" onClick={saveDiary}>{saved ? "저장되었습니다" : "일기 저장"}</button>
      </div>
    </section>
  );
}
