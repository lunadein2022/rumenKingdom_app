import type { ViewKey } from "../../app/types";

// 기본 Nav: 로비 / Quest / 세린 / Calendar / Castle. Library는 핵심 검색·기록
// 기능이라 Castle 내부 Fast Travel과 별도로 여기에도 둡니다.
const navItems: Array<{ key: ViewKey; label: string; icon: string }> = [
  { key: "home", label: "로비", icon: "🏠" },
  { key: "quests", label: "Quest", icon: "◆" },
  { key: "serin", label: "세린", icon: "✦" },
  { key: "calendar", label: "일정", icon: "□" },
  { key: "castle", label: "Castle", icon: "🏰" },
  { key: "library", label: "도서관", icon: "📚" },
];

interface BottomNavProps {
  activeView: ViewKey;
  onChange: (view: ViewKey) => void;
}

export function BottomNav({ activeView, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Princess OS navigation">
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
  );
}
