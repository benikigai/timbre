import { useState, useEffect, useRef, useCallback } from "react"
import type { AgentEvent, AgentName, AgentState } from "../types"

const AGENT_DEFAULTS: Record<AgentName, string> = {
  scout: "Scout",
  curate: "Curate",
  research: "Deep Research",
  writer: "Writer",
  voice: "Voice Check",
  verify: "Verify",
  multiplex: "Multiplex",
}

function createAgentState(name: AgentName, label: string): AgentState {
  return { name, label, status: "idle", events: [] }
}

export function useSSE() {
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [agents, setAgents] = useState<Record<AgentName, AgentState>>(() => {
    const a = {} as Record<AgentName, AgentState>
    for (const [name, label] of Object.entries(AGENT_DEFAULTS)) {
      a[name as AgentName] = createAgentState(name as AgentName, label)
    }
    return a
  })
  const [isConnected, setIsConnected] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  const connect = useCallback(() => {
    if (esRef.current) esRef.current.close()

    const es = new EventSource("/api/events")
    esRef.current = es

    es.onopen = () => setIsConnected(true)

    es.onmessage = (e) => {
      try {
        const event: AgentEvent = JSON.parse(e.data)
        setEvents((prev) => [...prev, event])
        setAgents((prev) => {
          const agent = prev[event.agent]
          if (!agent) return prev
          return {
            ...prev,
            [event.agent]: {
              ...agent,
              status: event.type === "status" ? (event.content as AgentState["status"]) : agent.status,
              events: [...agent.events, event],
              output: event.type === "text" ? (agent.output ?? "") + event.content : agent.output,
            },
          }
        })
      } catch {
        // skip malformed events
      }
    }

    es.onerror = () => {
      setIsConnected(false)
      es.close()
      setTimeout(connect, 3000)
    }
  }, []) // Empty dependency array because we want this callback to be stable

  useEffect(() => {
    connect()
    return () => esRef.current?.close()
  }, [connect])

  return { events, agents, isConnected }
}
