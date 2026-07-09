import type { ViewKey } from "../../app/types";

const dockItems: Array<{ view: ViewKey; label: string; icon: string }> = [
  { view: "home", label: "홈", icon: "🏰" },
  { view: "quests", label: "퀘스트", icon: "📜" },
  { view: "profile", label: "공주", icon: "👑" },
  { view: "serin", label: "세린", icon: "✨" },
  { view: "calendar", label: "캘린더", icon: "📅" },
];

interface CrystalDockProps {
  activeView: ViewKey;
  onNavigate: (view: ViewKey) => void;
}

export function CrystalDock({ activeView, onNavigate }: CrystalDockProps) {
  return (
    <nav className="crystal-dock" aria-label="Princess OS Crystal Dock">
      {dockItems.map((item) => (
        <button
          type="button"
          key={item.view}
          className={activeView === item.view ? "active" : ""}
          onClick={() => onNavigate(item.view)}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
