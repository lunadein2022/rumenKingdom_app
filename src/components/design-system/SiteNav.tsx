import type { ViewKey } from "../../app/types";

const navItems: Array<{ key: ViewKey; label: string }> = [
  { key: "home", label: "로비" },
  { key: "office", label: "집무실" },
  { key: "serin", label: "세린" },
  { key: "calendar", label: "왕실 일정표" },
  { key: "library", label: "왕국 도서관" },
];

interface SiteNavProps {
  activeView: ViewKey;
  onChange: (view: ViewKey) => void;
}

export function SiteNav({ activeView, onChange }: SiteNavProps) {
  return (
    <nav className="bottom-bar game-nav palace-bottom-nav" aria-label="Princess OS navigation">
      <img className="bottom-bar-image" src="/assets/bottom-bar.png" alt="" aria-hidden="true" />
      <div className="bottom-bar-items">
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`${item.key === activeView ? "active" : ""} ${item.key === "serin" ? "game-nav-serin" : ""}`}
            onClick={() => onChange(item.key)}
            aria-label={item.label}
          >
            {item.key === "serin" ? (
              <span className="game-nav-serin-portrait">
                <img src="/assets/nav-serin-icon.png" alt="" aria-hidden="true" />
              </span>
            ) : (
              <span className="game-nav-icon" aria-hidden="true" />
            )}
            <span className="game-nav-label">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
