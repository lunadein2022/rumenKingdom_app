import type { SerinProfile } from "../../../app/types";
import { Button } from "../../../components/design-system/Button";

interface GardenPageProps {
  serin: SerinProfile;
  onBackToCastle: () => void;
}

export function GardenPage({ serin, onBackToCastle }: GardenPageProps) {
  return (
    <section className="garden-page">
      <div className="garden-scene">
        <div className="garden-copy">
          <span>왕궁 정원</span>
          <h1>잠시 아무것도 하지 않아도 괜찮습니다.</h1>
          <p>{serin.name}이 조용히 곁을 지키고 있습니다. 이 공간에는 Quest도, 일정도, 생산성도 없습니다.</p>
        </div>
        <img className="garden-princess" src="/assets/princess-full-transparent.png" alt="정원에 선 공주" />
      </div>
      <section className="garden-serin-note">
        <strong>세린</strong>
        <p>공주님, 오늘은 정말 수고하셨어요. 이곳에서는 그냥 바람만 느끼셔도 됩니다.</p>
        <Button variant="glass" onClick={onBackToCastle}>왕성으로</Button>
      </section>
    </section>
  );
}
