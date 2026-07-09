import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  tone?: "royal" | "gold" | "soft" | "success";
}

export function Badge({ children, tone = "royal" }: BadgeProps) {
  return <span className={`ds-badge ds-badge--${tone}`}>{children}</span>;
}
