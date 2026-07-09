import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "glass" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button className={`ds-button ds-button--${variant} ds-button--${size} ${className}`} {...props}>
      {children}
    </button>
  );
}
