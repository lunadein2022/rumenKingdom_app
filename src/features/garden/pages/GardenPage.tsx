import type { SerinProfile } from "../../../app/types";

interface GardenPageProps {
  serin: SerinProfile;
  onBackToCastle: () => void;
}

// 정원은 카드가 나열된 생산성 화면이 아니라, 화면 전체를 채우는 배경 Scene입니다.
// 세린의 멘트도 카드가 아니라 말풍선 오버레이로만 떠 있습니다.
export function GardenPage({ serin, onBackToCastle }: GardenPageProps) {
  return (
    <section className="garden-scene-full scene-fullbleed">
      <div className="garden-scene-backdrop" style={{ backgroundImage: 'url("/assets/garden.webp")' }} />

      <img className="garden-princess-full" src="/assets/princess-full-final.png" alt="정원에 선 공주" />

      <div className="garden-copy-overlay">
        <span>왕궁 정원</span>
        <h1>잠시 아무것도 하지 않아도 괜찮습니다.</h1>
      </div>

      <div className="garden-speech-bubble">
        <strong>{serin.name}</strong>
        <p>공주님, 오늘은 정말 수고하셨어요. 이곳에는 Quest도, 일정도, 생산성도 없습니다. 그냥 바람만 느끼셔도 됩니다.</p>
      </div>

      <button type="button" className="garden-back-button" onClick={onBackToCastle}>
        왕성으로 돌아가기
      </button>
    </section>
  );
}
