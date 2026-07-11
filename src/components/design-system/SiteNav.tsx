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
      <div className="chrome-frame bottom-bar-frame">
        <img className="bottom-bar-image" src="/assets/bottom-bar-final.png" alt="" aria-hidden="true" />
      </div>
      <div className="bottom-bar-hit-areas" aria-label="Palace navigation menu">
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            aria-label={item.label}
            aria-current={item.key === activeView ? "page" : undefined}
          />
        ))}
      </div>
    </nav>
  );
}
