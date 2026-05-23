import type { ReactNode } from "react";
import { Header } from "./components/Header";
import type { RunState } from "./state/runStateTypes";

interface AppShellProps {
  state: RunState;
  scoutConnected: boolean;
  runConnected: boolean;
  onReset?: () => void;
  leftPanel: ReactNode;
  centerContent: ReactNode;
  overlays?: ReactNode;
}

/**
 * 2-zone grid per yolo-front spec: 260px Scout left, 1fr Center.
 * Council right-rail is dropped (collapsed into Header stage dots).
 */
export function AppShell({ state, scoutConnected, runConnected, onReset, leftPanel, centerContent, overlays }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-ink)] flex flex-col">
      <Header state={state} scoutConnected={scoutConnected} runConnected={runConnected} onReset={onReset} />
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-0">
        <aside className="border-r border-[color:var(--color-hairline)] overflow-y-auto lg:max-h-[calc(100vh-3.25rem)]">
          {leftPanel}
        </aside>
        <section className="overflow-y-auto lg:max-h-[calc(100vh-3.25rem)]">
          {centerContent}
        </section>
      </main>
      {overlays}
    </div>
  );
}
