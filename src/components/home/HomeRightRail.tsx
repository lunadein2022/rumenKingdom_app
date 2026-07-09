import type { MainQuest, ViewKey } from "../../app/types";
import type { CastleRoom, CastleRoomKey } from "../../features/castle/types/castle.types";
import { CastleMinimap } from "./CastleMinimap";

interface HomeRightRailProps {
  rooms: CastleRoom[];
  currentRoomKey: CastleRoomKey;
  activeMainQuests: MainQuest[];
  onNavigate: (view: ViewKey) => void;
}

// 오른쪽 Glass 오버레이 패널 묶음: 왕궁 지도(미니맵) + 진행 중 메인퀘스트(=프로젝트).
export function HomeRightRail({ rooms, currentRoomKey, activeMainQuests, onNavigate }: HomeRightRailProps) {
  return (
    <div className="home-right-rail">
      <CastleMinimap rooms={rooms} currentRoomKey={currentRoomKey} onFastTravel={onNavigate} />

      <section className="home-hud-panel main-quest-tracker-panel">
        <div className="home-hud-panel-head">
          <h2>진행 중 퀘스트</h2>
        </div>
        {activeMainQuests.length === 0 ? (
          <p className="home-hud-empty">진행 중인 메인퀘스트가 없습니다.</p>
        ) : (
          <ul className="main-quest-tracker-list">
            {activeMainQuests.slice(0, 2).map((mainQuest) => (
              <li key={mainQuest.id}>
                <strong>{mainQuest.title}</strong>
                <div className="main-quest-tracker-bar">
                  <div style={{ width: `${Math.min(100, mainQuest.progress)}%` }} />
                </div>
                <span>진행률 {mainQuest.progress}%</span>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="main-quest-tracker-more" onClick={() => onNavigate("office")}>
          + 퀘스트 더보기
        </button>
      </section>
    </div>
  );
}
