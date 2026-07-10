import type { ViewKey } from "../../app/types";

// 게임 HUD식 하단 네비게이션 (레퍼런스: 로비 / 집무실 / 세린(중앙 아바타) /
// 왕실 일정표 / 왕국 도서관). 퀘스트는 별도 공간이 아니라 집무실이 담당하고,
// 침실/정원/왕좌 등 방 이동은 로비의 왕궁 지도가 담당합니다.
const leftItems: Array<{ key: ViewKey; label: string; icon: string }> = [
  { key: "home", label: "로비", icon: "♜" },
  { key: "office", label: "집무실", icon: "✒" },
];

const rightItems: Array<{ key: ViewKey; label: string; icon: string }> = [
  { key: "calendar", label: "왕실 일정표", icon: "▦" },
  { key: "library", label: "왕국 도서관", icon: "▤" },
];

interface SiteNavProps {
  activeView: ViewKey;
  onChange: (view: ViewKey) => void;
}

export function SiteNav({ activeView, onChange }: SiteNavProps) {
  function renderItem(item: { key: ViewKey; label: string; icon: string }) {
    return (
      <button
        key={item.key}
        type="button"
        className={item.key === activeView ? "active" : ""}
        onClick={() => onChange(item.key)}
      >
        <span className="game-nav-icon">{item.icon}</span>
        <span className="game-nav-label">{item.label}</span>
      </button>
    );
  }

  return (
    <nav className="game-nav" aria-label="Princess OS navigation">
      {leftItems.map(renderItem)}

      {/* 중앙: 세린 아바타. 다른 항목보다 크게, 원형 초상으로. */}
      <button
        type="button"
        className={`game-nav-serin ${activeView === "serin" ? "active" : ""}`}
        onClick={() => onChange("serin")}
        aria-label="세린"
      >
        <span className="game-nav-serin-portrait">
          <img src="/assets/serin-bust-transparent.webp" alt="세린" />
        </span>
        <span className="game-nav-label">세린</span>
      </button>

      {rightItems.map(renderItem)}
    </nav>
  );
}
