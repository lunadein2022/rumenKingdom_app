import type { ViewKey } from "../../app/types";

const navItems: Array<{ key: ViewKey; label: string; icon: string }> = [
  { key: "home", label: "로비", icon: "♜" },
  { key: "office", label: "집무실", icon: "▣" },
  { key: "serin", label: "세린", icon: "" },
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
    <nav className="game-nav palace-bottom-nav" aria-label="Princess OS navigation">
      {navItems.map((item) =>
        item.key === "serin" ? (
          <button
            key={item.key}
            type="button"
            className={`game-nav-serin ${activeView === "serin" ? "active" : ""}`}
            onClick={() => onChange("serin")}
            aria-label="세린"
          >
            <span className="game-nav-serin-portrait">
              <img src="/assets/serin-avatar-final.png" alt="세린" />
            </span>
            <span className="game-nav-label">세린</span>
          </button>
        ) : (
          renderItem(item)
        ),
      )}
    </nav>
  );
}
