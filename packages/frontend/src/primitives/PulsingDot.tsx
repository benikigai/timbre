interface PulsingDotProps {
  variant?: "idle" | "active" | "done" | "error";
  size?: number;
  className?: string;
}

const VARIANT_STYLES: Record<NonNullable<PulsingDotProps["variant"]>, { color: string; pulse: boolean }> = {
  idle: { color: "var(--color-ink-mute)", pulse: false },
  active: { color: "var(--color-amber)", pulse: true },
  done: { color: "var(--color-sage)", pulse: false },
  error: { color: "var(--color-danger)", pulse: false },
};

export function PulsingDot({ variant = "idle", size = 8, className = "" }: PulsingDotProps) {
  const { color, pulse } = VARIANT_STYLES[variant];
  return (
    <span
      className={`inline-block rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: color,
        boxShadow: variant === "active" ? `0 0 12px ${color}` : "none",
        animation: pulse ? "pulse-dot 1.6s ease-in-out infinite" : "none",
        flexShrink: 0,
      }}
    />
  );
}
