import type { ViewKey } from "../../app/types";

// 게임 HUD식 하단 네비게이션입니다(참고: 로스트아크형 중앙 하단 독).
// SaaS식 상단 탭 대신, 화면 하단 중앙에 아이콘 독으로 떠 있습니다.
// Castle 내부 방(Office/Bedroom/Throne 등) 이동은 왕성(Castle) 화면이 전담합니다.
const navItems: Array<{ key: ViewKey; label: string; icon: string }> = [
  { key: "home", label: "홈", icon: "⌂" },
  { key: "quests", label: "퀘스트", icon: "✦" },
  { key: "calendar", label: "캘린더", icon: "▦" },
  { key: "serin", label: "세린", icon: "❖" },
  { key: "castle", label: "왕성", icon: "♜" },
  { key: "library", label: "기록", icon: "▤" },
];

interface SiteNavProps {
  activeView: ViewKey;
  onChange: (view: ViewKey) => void;
}

export function SiteNav({ activeView, onChange }: SiteNavProps) {
  return (
    <nav className="game-nav" aria-label="Princess OS navigation">
      {navItems.map((item) => (
        <button
          key={item.key}
          type="button"
          className={item.key === activeView ? "active" : ""}
          onClick={() => onChange(item.key)}
        >
          <span className="game-nav-icon">{item.icon}</span>
          <span className="game-nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
