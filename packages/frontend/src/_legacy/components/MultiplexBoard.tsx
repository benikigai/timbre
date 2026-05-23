import { useState, useEffect } from "react"
import type { AgentEvent } from "../types"

interface MultiplexBoardProps {
  events: AgentEvent[]
}

export function MultiplexBoard({ events }: MultiplexBoardProps) {
  const [radioOutput, setRadioOutput] = useState<string>("")
  const [ttsOutput, setTtsOutput] = useState<string>("")

  // Filter events related to Multiplex (Stage 7) or Vibecheck done metadata
  useEffect(() => {
    events.forEach((evt) => {
      if (evt.agent === "multiplex") {
        if (evt.type === "text") {
          if (evt.content.includes("### [AI Talk Radio]")) {
            setRadioOutput((prev) => prev + evt.content)
          } else if (evt.content.includes("### [TTS Audio Bulletin]")) {
            setTtsOutput((prev) => prev + evt.content)
          }
        }
      }
    })
  }, [events])

  return (
    <div className="max-w-7xl mx-auto py-6 flex flex-col gap-6">
      {/* Overview Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white flex flex-col gap-2">
        <h2 className="text-lg font-bold tracking-tight bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent uppercase font-mono">
          Stage 7 — Multimodal Multiplex Board
        </h2>
        <p className="text-slate-400 text-xs font-mono max-w-2xl">
          On draft validation approval, Timbre fans out the voice-preserved technical post into parallel social, audio, and visual format runs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: AI Talk Radio */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col text-white h-[350px] overflow-hidden">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider">
              📻 AI Talk Radio Segment
            </h3>
            <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              STATEFUL AGENT
            </span>
          </div>

          {/* Radio Waveform Visualizer */}
          <div className="h-16 flex items-center justify-center gap-1.5 bg-slate-950 border border-slate-850 rounded-xl mb-4 flex-shrink-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-radial-gradient from-purple-500/5 to-transparent"></div>
            {/* Animated Wave Bars */}
            {[12, 24, 38, 16, 42, 54, 30, 48, 62, 70, 40, 26, 44, 38, 52, 28, 16, 34, 46, 20].map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className="w-1.5 bg-gradient-to-t from-purple-600 to-pink-500 rounded-full animate-pulse"
              ></div>
            ))}
          </div>

          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 overflow-y-auto font-mono text-xs text-slate-300 scrollbar-thin">
            {radioOutput ? (
              <div className="whitespace-pre-wrap">{radioOutput}</div>
            ) : (
              <div className="space-y-4">
                <div className="font-bold text-slate-400">[RADIO HOST]:</div>
                <div className="italic text-slate-300">
                  "Welcome back to DevSpace Radio. Today we are unpacking Benjamin's latest article on the Shift to Agentic Web Infrastructure. We've got Elias on the line calling from a Mac Mini..."
                </div>
                <div className="font-bold text-indigo-400">[CALLER ELIAS]:</div>
                <div className="italic text-slate-300">
                  "Hey guys! Yeah, I'm looking at these post_tool_call hooks in the Antigravity 2.0 SDK. This makes client side interception extremely lightweight..."
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: TTS Audio Bulletin */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col text-white h-[350px] overflow-hidden">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider">
              🎙️ TTS Audio Executive Bulletin
            </h3>
            <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              60s SUMMARY
            </span>
          </div>

          {/* Simple Audio Player UI */}
          <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex items-center justify-between gap-4 mb-4 flex-shrink-0">
            <button className="h-10 w-10 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center font-bold shadow-md cursor-pointer transition-all">
              ▶
            </button>
            <div className="flex-1">
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
              </div>
              <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
                <span>0:20</span>
                <span>1:00</span>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 overflow-y-auto font-mono text-xs text-slate-300 scrollbar-thin">
            {ttsOutput ? (
              <div className="whitespace-pre-wrap">{ttsOutput}</div>
            ) : (
              <div className="space-y-2">
                <p className="font-bold text-slate-400">[TTS VOICE - GEMINI 2.5 TTS]:</p>
                <p className="italic text-slate-300">
                  "In this briefing: Client runtimes are evolving from presentation trees into active agent topologies. By leveraging the co-optimized Gemini 3.5 Flash model inside the Google Antigravity 2.0 SDK framework, we achieve a 30% reduction in agent loop latency. We explore persistent sandboxes via the stateful Interactions API to manage configuration ledgers..."
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Nano Banana Carousel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col text-white h-[400px] overflow-hidden">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider">
              🍌 Nano Banana Social Carousel (Slide 1/3)
            </h3>
            <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              GEMINI 3 PRO IMAGE
            </span>
          </div>

          {/* Mock Social Slide Render */}
          <div className="flex-1 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-center p-6 relative overflow-hidden flex-shrink-0 mb-4">
            <div className="absolute inset-0 bg-radial-gradient from-purple-500/10 to-transparent"></div>
            <div className="max-w-[280px] text-center flex flex-col gap-3 z-10 border border-slate-800 p-5 rounded-2xl bg-slate-900 bg-opacity-65 backdrop-blur-sm">
              <span className="text-[9px] font-mono text-purple-400 font-bold uppercase tracking-widest">TIMBRE SHIFTS</span>
              <h4 className="text-sm font-extrabold tracking-tight font-mono text-white">
                AGENTIC WEB INFRASTRUCTURE
              </h4>
              <p className="text-[10px] text-slate-400 font-mono">
                "We are shifting toward running multi-agent topologies directly on-device. Are static render trees dead?"
              </p>
            </div>
          </div>

          {/* Carousel indicators */}
          <div className="flex items-center justify-center gap-1.5">
            <span className="h-1.5 w-4 rounded-full bg-purple-500"></span>
            <span className="h-1.5 w-1.5 rounded-full bg-slate-800"></span>
            <span className="h-1.5 w-1.5 rounded-full bg-slate-800"></span>
          </div>
        </div>

        {/* Card 4: Omni Hero Clip */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col text-white h-[400px] overflow-hidden">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider">
              🎬 Omni Hero Clip Talking-Head
            </h3>
            <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              VEO 15s VIDEO
            </span>
          </div>

          {/* Mock Video Player */}
          <div className="flex-1 bg-slate-950 border border-slate-850 rounded-xl overflow-hidden relative flex-shrink-0 mb-4 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950"></div>
            <div className="absolute h-12 w-12 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-white/10 hover:scale-105 transition-all shadow-xl shadow-purple-500/10">
              <span className="text-white text-lg ml-0.5">▶</span>
            </div>
            <span className="absolute bottom-3 left-3 text-[9px] font-mono text-slate-500">
              [VEO_HERO_CLIP_001.MP4]
            </span>
          </div>

          <div className="flex-shrink-0 font-mono text-[10px] text-slate-500">
            <span className="font-bold text-slate-400">PROMPT DIRECTIVE:</span> Ingest technical blog script, output 15s talking-head video with background server nodes pulsing in indigo neon.
          </div>
        </div>
      </div>
    </div>
  )
}
