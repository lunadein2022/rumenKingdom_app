import type { ViewKey } from "../../app/types";

const navItems: Array<{ key: ViewKey; label: string; icon: string }> = [
  { key: "home", label: "홈", icon: "🏰" },
  { key: "quests", label: "퀘스트", icon: "📜" },
  { key: "profile", label: "공주", icon: "👑" },
  { key: "serin", label: "세린", icon: "✨" },
  { key: "calendar", label: "캘린더", icon: "📅" },
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
