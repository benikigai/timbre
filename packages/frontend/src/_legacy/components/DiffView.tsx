import { useState, useEffect } from "react"
import type { AgentEvent } from "../types"

interface DiffViewProps {
  events: AgentEvent[]
}

interface Sliders {
  sentenceLength: "concise" | "standard" | "elaborate"
  tone: string
  humor: "dry" | "sarcastic" | "none"
  depth: "high" | "medium" | "low"
}

export function DiffView({ events }: DiffViewProps) {
  const [sliders, setSliders] = useState<Sliders>({
    sentenceLength: "concise",
    tone: "direct, engineering-first, slightly skeptical",
    humor: "dry",
    depth: "high",
  })
  const [isRegenerating, setIsRegenerating] = useState(false)

  // Extract raw draft and final draft from events
  const writerEvents = events.filter((e) => e.agent === "writer" && e.type === "text")
  const rawDraft = writerEvents.length > 0 ? writerEvents[writerEvents.length - 1].content : ""

  const voiceEvents = events.filter((e) => e.agent === "voice" && e.type === "text")
  const finalDraft = voiceEvents.length > 0 ? voiceEvents[voiceEvents.length - 1].content : ""

  // Extract clashes
  const clashEvents = events.filter(
    (e) => e.agent === "voice" && e.type === "diff"
  )

  const [clashes, setClashes] = useState<any[]>([])

  useEffect(() => {
    const activeClashes: Record<number, any> = {}
    
    clashEvents.forEach((evt) => {
      try {
        const payload = JSON.parse(evt.content)
        if (payload.severity) {
          // It's a clash detection
          activeClashes[payload.id] = { ...payload, resolved: false }
        } else if (payload.id) {
          // It's a resolution
          if (activeClashes[payload.id]) {
            activeClashes[payload.id].resolved = true
            activeClashes[payload.id].resolutionText = payload.resolution
          }
        }
      } catch (e) {
        // Ignore
      }
    })

    setClashes(Object.values(activeClashes))
  }, [clashEvents])

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    try {
      await fetch("/api/regenerate-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sliders }),
      })
    } catch (e) {
      console.error(e)
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-6 flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
      {/* Sidebar: Controls & Clashes */}
      <div className="w-full lg:w-80 flex flex-col gap-6 flex-shrink-0 overflow-y-auto pr-2 scrollbar-thin">
        {/* Sliders Control Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex flex-col gap-4">
          <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
            Voice DNA Controls
          </h3>
          
          {/* Tone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono text-slate-400">Tone descriptor</label>
            <input
              type="text"
              value={sliders.tone}
              onChange={(e) => setSliders({ ...sliders, tone: e.target.value })}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          {/* Sentence Length */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono text-slate-400">Sentence Length</label>
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 border border-slate-850 rounded-lg text-[10px] font-mono">
              {(["concise", "standard", "elaborate"] as const).map((len) => (
                <button
                  key={len}
                  onClick={() => setSliders({ ...sliders, sentenceLength: len })}
                  className={`py-1 rounded capitalize transition-all cursor-pointer ${
                    sliders.sentenceLength === len ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {len}
                </button>
              ))}
            </div>
          </div>

          {/* Humor */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono text-slate-400">Humor Mode</label>
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 border border-slate-850 rounded-lg text-[10px] font-mono">
              {(["none", "dry", "sarcastic"] as const).map((hum) => (
                <button
                  key={hum}
                  onClick={() => setSliders({ ...sliders, humor: hum })}
                  className={`py-1 rounded capitalize transition-all cursor-pointer ${
                    sliders.humor === hum ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {hum}
                </button>
              ))}
            </div>
          </div>

          {/* Technical Depth */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono text-slate-400">Technical Depth</label>
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 border border-slate-850 rounded-lg text-[10px] font-mono">
              {(["low", "medium", "high"] as const).map((dp) => (
                <button
                  key={dp}
                  onClick={() => setSliders({ ...sliders, depth: dp })}
                  className={`py-1 rounded capitalize transition-all cursor-pointer ${
                    sliders.depth === dp ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {dp}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleRegenerate}
            disabled={isRegenerating || !rawDraft}
            className="w-full bg-slate-850 hover:bg-slate-800 text-purple-400 hover:text-purple-300 border border-slate-800 rounded-lg py-2 text-xs font-semibold font-mono tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            {isRegenerating ? "Regenerating..." : "Regenerate Style"}
          </button>
        </div>

        {/* Clash Ledger */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex flex-col min-h-[250px]">
          <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 mb-3">
            Clash Ledger
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
            {clashes.length === 0 ? (
              <div className="text-slate-600 text-center text-xs font-mono py-12">
                No clashes detected in active draft.
              </div>
            ) : (
              clashes.map((clash) => {
                let badgeColor = "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                if (clash.severity === "high") {
                  badgeColor = "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }

                return (
                  <div
                    key={clash.id}
                    className={`p-3 rounded-xl bg-slate-950 border border-slate-850 flex flex-col gap-2 font-mono text-[10px] ${
                      clash.resolved ? "opacity-60" : "border-amber-500/30 shadow-md shadow-amber-500/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-400">CLAIM ID #{clash.factId}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase ${badgeColor}`}>
                        {clash.severity}
                      </span>
                    </div>

                    <div className="text-slate-500">
                      <div className="text-slate-400 font-bold mb-0.5">Original fact:</div>
                      <div className="italic">"{clash.originalText}"</div>
                    </div>

                    <div className="text-rose-400/90 line-through">
                      <div className="text-slate-400 font-bold mb-0.5">Style shift:</div>
                      <div>"{clash.modifiedText}"</div>
                    </div>

                    {clash.resolved ? (
                      <div className="text-emerald-400 border-t border-slate-850 pt-2 mt-1">
                        <span className="font-bold uppercase tracking-wider mr-1">[AUTO-RESOLVED]:</span>
                        {clash.resolutionText || clash.resolution}
                      </div>
                    ) : (
                      <div className="text-amber-400 animate-pulse border-t border-slate-850 pt-2 mt-1">
                        ⚠️ UNRESOLVED CLASH — AUDITING
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Main Diff Content */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
        {/* Left Side: Raw Writer Draft */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
              STAGE 4 — Raw Writer Output
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">DRAFT_RAW.MD</span>
          </div>
          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-y-auto font-mono text-xs text-slate-300 scrollbar-thin select-text whitespace-pre-wrap">
            {rawDraft || (
              <div className="text-slate-600 flex items-center justify-center h-full text-[11px]">
                Waiting for writer output stream...
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Vibe Check Rewrite */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-purple-400">
              STAGE 5 — Voice Preserved Draft
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">DRAFT_FINAL.MD</span>
          </div>
          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-y-auto font-mono text-xs text-slate-300 scrollbar-thin select-text whitespace-pre-wrap">
            {finalDraft || (
              <div className="text-slate-600 flex items-center justify-center h-full text-[11px]">
                Waiting for voice check rewrite stream...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
