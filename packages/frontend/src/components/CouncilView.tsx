import { useRef, useEffect } from "react"
import type { AgentState, AgentName } from "../types"

interface CouncilViewProps {
  agents: Record<AgentName, AgentState>
}

export function CouncilView({ agents }: CouncilViewProps) {
  // Let's create an ordered array of the pipeline stages for rendering
  const stageOrder: AgentName[] = ["scout", "curate", "research", "writer", "voice", "verify", "multiplex"]

  return (
    <div className="max-w-7xl mx-auto py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stageOrder.map((name, index) => {
          const agent = agents[name]
          const isRunning = agent.status === "running"
          const isComplete = agent.status === "complete"
          const isError = agent.status === "error"

          return (
            <AgentCard
              key={name}
              agent={agent}
              stageNumber={index + 1}
              isRunning={isRunning}
              isComplete={isComplete}
              isError={isError}
            />
          )
        })}
      </div>
    </div>
  )
}

interface AgentCardProps {
  agent: AgentState
  stageNumber: number
  isRunning: boolean
  isComplete: boolean
  isError: boolean
}

function AgentCard({ agent, stageNumber, isRunning, isComplete, isError }: AgentCardProps) {
  const terminalEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom of terminal when events stream in
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [agent.events])

  // Get status color tokens
  let statusBadgeColor = "bg-slate-800 text-slate-400"
  let borderGlow = "border-slate-800"

  if (isRunning) {
    statusBadgeColor = "bg-purple-500/10 text-purple-400 border border-purple-500/30"
    borderGlow = "border-purple-500 shadow-lg shadow-purple-500/20"
  } else if (isComplete) {
    statusBadgeColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
    borderGlow = "border-emerald-950"
  } else if (isError) {
    statusBadgeColor = "bg-rose-500/10 text-rose-400 border border-rose-500/30"
    borderGlow = "border-rose-500 shadow-lg shadow-rose-500/15"
  }

  return (
    <div
      className={`bg-slate-900 border rounded-2xl p-5 flex flex-col h-[400px] transition-all duration-300 ${borderGlow}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono bg-slate-950 px-2 py-0.5 rounded text-slate-400">
            0{stageNumber}
          </span>
          <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono">{agent.label}</h3>
        </div>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${statusBadgeColor}`}>
          {agent.status}
        </span>
      </div>

      {/* Terminal logs (Event stream) */}
      <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 overflow-y-auto font-mono text-xs text-slate-300 scrollbar-thin select-text">
        {agent.events.length === 0 ? (
          <div className="text-slate-600 flex items-center justify-center h-full text-[11px]">
            Waiting for session triggers...
          </div>
        ) : (
          <div className="space-y-2">
            {agent.events.map((evt) => {
              if (evt.type === "thought") {
                return (
                  <div key={evt.id} className="text-slate-400 italic pl-2 border-l border-slate-800">
                    <span className="text-[10px] text-slate-600 mr-1.5">
                      {new Date(evt.timestamp).toLocaleTimeString([], { hour12: false })}
                    </span>
                    {evt.content}
                  </div>
                )
              }
              if (evt.type === "text") {
                return (
                  <div key={evt.id} className="text-slate-100 whitespace-pre-wrap">
                    {evt.content}
                  </div>
                )
              }
              if (evt.type === "error") {
                return (
                  <div key={evt.id} className="text-rose-400 bg-rose-950/20 border border-rose-900/30 rounded p-1.5">
                    {evt.content}
                  </div>
                )
              }
              return null;
            })}
            <div ref={terminalEndRef} />
          </div>
        )}
      </div>

      {/* Output preview footer */}
      {agent.output && (
        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-mono">ASSET SYNTHESIZED</span>
          <span className="text-[10px] text-purple-400 font-mono font-bold">
            {agent.output.length} chars
          </span>
        </div>
      )}
    </div>
  )
}
