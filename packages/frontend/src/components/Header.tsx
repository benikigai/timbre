import { useState } from "react"

interface HeaderProps {
  view: "council" | "diff" | "multiplex"
  setView: (view: "council" | "diff" | "multiplex") => void
  isConnected: boolean
}

export function Header({ view, setView, isConnected }: HeaderProps) {
  const [topic, setTopic] = useState("The Shift to Agentic Web Infrastructure")
  const [isLaunching, setIsLaunching] = useState(false)

  const handleStartPipeline = async () => {
    setIsLaunching(true)
    try {
      await fetch("/api/start-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          sliders: {
            sentenceLength: "concise",
            tone: "direct, engineering-first, slightly skeptical",
            humor: "dry",
            depth: "high"
          }
        })
      })
    } catch (e) {
      console.error(e)
    } finally {
      setIsLaunching(false)
    }
  }

  const handleTriggerScout = async () => {
    try {
      await fetch("/api/scout", { method: "POST" })
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white p-4 shadow-lg sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title / Logo */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 animate-pulse">
            <span className="text-xl font-bold font-mono tracking-tighter">T</span>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              TIMBRE
            </h1>
            <p className="text-xs text-slate-400 font-mono">Voice-Preserving Content Engine</p>
          </div>
        </div>

        {/* Input & Action buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-xl mx-0 md:mx-4">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter technical topic..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-mono"
          />
          <button
            onClick={handleStartPipeline}
            disabled={isLaunching}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-all shadow-md shadow-purple-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {isLaunching ? (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              "Run Pipeline"
            )}
          </button>
          <button
            onClick={handleTriggerScout}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-3 py-2 rounded-lg transition-all font-mono whitespace-nowrap cursor-pointer"
          >
            Trigger Scout
          </button>
        </div>

        {/* Navigation / Views */}
        <div className="flex items-center gap-2">
          <nav className="flex bg-slate-950 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setView("council")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                view === "council"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/10"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Council View
            </button>
            <button
              onClick={() => setView("diff")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                view === "diff"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/10"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Split Diff
            </button>
            <button
              onClick={() => setView("multiplex")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                view === "multiplex"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/10"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Multiplex
            </button>
          </nav>

          {/* Connection Status Dot */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isConnected ? "bg-emerald-500 shadow-emerald-500/50 shadow-lg animate-pulse" : "bg-rose-500 animate-ping"
              }`}
            ></span>
            <span className="text-[10px] text-slate-400 font-mono hidden lg:inline">
              {isConnected ? "ONLINE" : "CONNECTING"}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
