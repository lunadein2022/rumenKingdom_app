import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  tone?: "glass" | "solid" | "deep";
}

export function Card({ children, tone = "glass", className = "", ...props }: CardProps) {
  return (
    <article className={`ds-card ds-card--${tone} ${className}`} {...props}>
      {children}
    </article>
  );
}
