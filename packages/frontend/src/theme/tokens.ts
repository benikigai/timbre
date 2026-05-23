// Palette tokens — mirror of @theme block in index.css. Use only when you need to
// reference colors from JS (e.g. inline styles, canvas, dynamic gradient stops).
// For everything else, prefer Tailwind utility classes (bg-sage, text-amber, etc.).

export const palette = {
  bg: "#0D110F",
  surface: "rgba(255,255,255,0.035)",
  surfaceHi: "rgba(255,255,255,0.06)",
  hairline: "rgba(255,255,255,0.07)",
  ink: "#F2EFE5",
  inkDim: "rgba(242,239,229,0.6)",
  inkMute: "rgba(242,239,229,0.36)",
  sage: "#7FA98B",
  sageDeep: "#5C8170",
  amber: "#E8A574",
  amberHot: "#D89254",
  gold: "#F4D8A0",
  warn: "#E8A574",
  good: "#7FA98B",
  danger: "#E07A6A",
} as const;

export type Palette = typeof palette;
