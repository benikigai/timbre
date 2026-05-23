import { Link } from "react-router-dom";
import { GlassPanel } from "../primitives/GlassPanel";

const STAGES = [
  {
    n: "01",
    name: "Scout",
    one: "Monitors your industry, 24/7",
    body: "An always-on Antigravity agent runs every hour, scanning your RSS feeds, HN tags, and arXiv categories. Scores every candidate against your voice profile. Surfaces the few that genuinely deserve your attention.",
  },
  {
    n: "02",
    name: "Curate",
    one: "Picks what's worth writing about",
    body: "Flash ranks Scout's candidates against your strategic focus. Three top picks per run — never more, never random.",
  },
  {
    n: "03",
    name: "Research",
    one: "Builds the evidence pack",
    body: "Deep Research proposes a plan. You modify it on stage if you want. It then runs collaboratively — visible reasoning, live citations, agent-generated charts.",
  },
  {
    n: "04",
    name: "Write",
    one: "Drafts a comprehensive article",
    body: "Consumes the entire research pack as conversation history. Writes the post with structure, code, and the charts Research produced.",
  },
  {
    n: "05",
    name: "Voice",
    one: "Rewrites in your voice, sentence by sentence",
    body: "The diff between the writer's draft and your voice is the centerpiece. Strike-throughs and insertions, live, with a reason on every change.",
  },
  {
    n: "06",
    name: "Verify",
    one: "Catches drift introduced by voice transfer",
    body: "Compares the rewrite against the original evidence. Re-grounds any claim that drifted. The agent built to fight for your facts.",
  },
  {
    n: "07",
    name: "Multiplex",
    one: "Fans out to audio, carousel, video",
    body: "One approval. Audio bulletin, social carousel, hero clip — all from the verified post. No re-writes, no second prompts.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-ink)] flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-10 backdrop-blur-md bg-[color:var(--color-bg)]/70 border-b border-[color:var(--color-hairline)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <Link
            to="/"
            className="font-[family-name:var(--font-display)] font-semibold tracking-tight text-lg"
            style={{ letterSpacing: "0.02em" }}
          >
            timbre
          </Link>
          <Link
            to="/demo"
            className="text-sm text-[color:var(--color-ink)] hover:text-[color:var(--color-amber)] transition-colors"
          >
            Watch the demo&nbsp;→
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="px-6 pt-24 pb-20 lg:pt-32 lg:pb-28">
        <div className="max-w-4xl mx-auto">
          <p className="text-[color:var(--color-sage)] text-sm uppercase tracking-[0.16em] mb-6 font-mono">
            Multi-agent content engine
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-5xl md:text-7xl leading-[1.05] tracking-tight mb-8">
            A writer that{" "}
            <em
              className="not-italic text-[color:var(--color-amber)]"
              style={{ fontStyle: "italic" }}
            >
              sounds like you.
            </em>
          </h1>
          <p className="text-xl md:text-2xl text-[color:var(--color-ink-dim)] leading-relaxed max-w-2xl mb-12">
            Timbre monitors your industry, researches what matters, and
            publishes in your voice — preserved through a seven-stage agentic
            pipeline by an agent built to fight for it.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 bg-[color:var(--color-amber)] text-[color:var(--color-bg)] font-medium px-6 py-3 rounded-full hover:bg-[color:var(--color-amber-hot)] transition-colors"
            >
              Watch it run &nbsp;→
            </Link>
            <span className="text-sm text-[color:var(--color-ink-mute)] font-mono">
              Live + cached demo · 3 min
            </span>
          </div>
        </div>
      </header>

      {/* How it works */}
      <section className="px-6 py-20 border-t border-[color:var(--color-hairline)]">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-16">
            <p className="text-[color:var(--color-sage)] text-sm uppercase tracking-[0.16em] mb-4 font-mono">
              How Timbre works
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl leading-tight tracking-tight">
              Seven stages. Two judging audiences. One product.
            </h2>
            <p className="text-[color:var(--color-ink-dim)] mt-4 text-lg">
              Each stage is a real Gemini primitive doing load-bearing work —
              Antigravity managed agents, Deep Research with collaborative
              planning, multimodal generation. The voice preservation is the
              part nobody else does.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {STAGES.map((s) => (
              <GlassPanel key={s.n} className="p-6 flex flex-col gap-3">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-[color:var(--color-ink-mute)]">
                    {s.n}
                  </span>
                  <h3 className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
                    {s.name}
                  </h3>
                </div>
                <p className="text-[color:var(--color-sage)] text-sm">
                  {s.one}
                </p>
                <p className="text-[color:var(--color-ink-dim)] text-sm leading-relaxed">
                  {s.body}
                </p>
              </GlassPanel>
            ))}
          </div>
        </div>
      </section>

      {/* Closer */}
      <section className="px-6 py-24 border-t border-[color:var(--color-hairline)]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-5xl leading-tight tracking-tight mb-6">
            Built for technical founders.
          </h2>
          <p className="text-xl text-[color:var(--color-ink-dim)] mb-10 leading-relaxed">
            Monday morning, you wake up to a post in your voice, with your
            facts, ready to ship. While you slept, Timbre wrote it.
          </p>
          <Link
            to="/demo"
            className="inline-flex items-center gap-2 bg-[color:var(--color-amber)] text-[color:var(--color-bg)] font-medium px-6 py-3 rounded-full hover:bg-[color:var(--color-amber-hot)] transition-colors"
          >
            Watch the live demo &nbsp;→
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10 border-t border-[color:var(--color-hairline)] mt-auto">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-sm text-[color:var(--color-ink-mute)]">
          <span className="font-mono">
            Cerebral Valley · Google I/O Hackathon · May 2026
          </span>
          <div className="flex items-center gap-6">
            <Link
              to="/demo"
              className="hover:text-[color:var(--color-ink)] transition-colors"
            >
              Demo
            </Link>
            <a
              href="https://github.com/benikigai/timbre"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[color:var(--color-ink)] transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
