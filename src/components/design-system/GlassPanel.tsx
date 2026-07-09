import type { HTMLAttributes, ReactNode } from "react";

interface GlassPanelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export function GlassPanel({ children, className = "", ...props }: GlassPanelProps) {
  return (
    <section className={`glass-panel ${className}`} {...props}>
      {children}
    </section>
  );
}
