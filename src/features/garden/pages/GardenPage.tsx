import type { SerinProfile } from "../../../app/types";

interface GardenPageProps {
  serin: SerinProfile;
  onBackToCastle: () => void;
}

export function GardenPage({ serin, onBackToCastle }: GardenPageProps) {
  return (
    <section className="website-scene garden-page">
      <div className="scene-shade garden-shade" />
      <header className="scene-title-block garden-title">
        <span>Garden</span>
        <h1>왕궁정원</h1>
        <p>이 공간에는 Quest도, 일정도 없습니다. 잠시 쉬어가세요.</p>
      </header>

      <img className="garden-princess" src="/assets/princess-full-transparent.png" alt="정원에 선 공주" />

      <section className="garden-serin-note">
        <strong>{serin.name}</strong>
        <p>공주님, 오늘은 정말 수고하셨어요. 이곳에서는 아무것도 해내지 않아도 괜찮습니다.</p>
        <button type="button" onClick={onBackToCastle}>왕궁 지도로</button>
      </section>
    </section>
  );
}
