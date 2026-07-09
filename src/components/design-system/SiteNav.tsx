import type { ViewKey } from "../../app/types";

// Princess OS는 모바일 앱이 아니라 게임화된 반응형 웹사이트입니다. 데스크톱
// 기본값은 상단 고정(sticky) Navigation이고, 모바일에서만 하단 Compact
// Nav로 전환됩니다. Castle 내부 이동(Office/Bedroom/Relationship/Throne 등)은
// 여기 기본 Nav가 아니라 Castle의 왕궁 지도 / Fast Travel이 전담합니다.
const navItems: Array<{ key: ViewKey; label: string; icon: string }> = [
  { key: "home", label: "로비", icon: "🏠" },
  { key: "quests", label: "Quest", icon: "◆" },
  { key: "serin", label: "세린", icon: "✦" },
  { key: "calendar", label: "일정", icon: "□" },
  { key: "castle", label: "Castle", icon: "🏰" },
  { key: "library", label: "도서관", icon: "📚" },
];

interface SiteNavProps {
  activeView: ViewKey;
  onChange: (view: ViewKey) => void;
}

// 데스크톱: 상단 sticky Navigation. 모바일: 하단 Compact Nav.
// 두 마크업을 함께 렌더링하고 CSS 미디어쿼리로 하나만 보이게 전환합니다
// (JS 브레이크포인트 감지 없이, 이 코드베이스 전반의 CSS-driven 반응형 패턴을 따릅니다).
export function SiteNav({ activeView, onChange }: SiteNavProps) {
  return (
    <>
      <nav className="site-nav-top" aria-label="Princess OS navigation">
        <span className="site-nav-brand">✦ PRINCESS OS</span>
        <div className="site-nav-links">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={item.key === activeView ? "active" : ""}
              onClick={() => onChange(item.key)}
            >
              <span className="site-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <nav className="site-nav-mobile" aria-label="Princess OS navigation mobile">
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={item.key === activeView ? "active" : ""}
            onClick={() => onChange(item.key)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
