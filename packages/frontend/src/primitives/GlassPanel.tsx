import type { ReactNode, HTMLAttributes } from "react";

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  active?: boolean;
}

export function GlassPanel({ children, active, className = "", ...rest }: GlassPanelProps) {
  return (
    <div
      {...rest}
      className={`bg-[var(--color-surface)] backdrop-blur-md border rounded-2xl ${
        active ? "border-[color:var(--color-amber)]/40 shadow-[0_0_24px_-8px_rgba(232,165,116,0.35)]" : "border-[color:var(--color-hairline)]"
      } transition-colors duration-300 ${className}`}
    >
      {children}
    </div>
  );
}
