export type AgentName = "scout" | "curate" | "research" | "writer" | "voice" | "verify" | "multiplex"

export interface AgentEvent {
  id: string
  agent: AgentName
  type: "thought" | "text" | "image" | "status" | "diff" | "error"
  content: string
  timestamp: number
  metadata?: Record<string, unknown>
}

export interface AgentState {
  name: AgentName
  label: string
  status: "idle" | "running" | "complete" | "error"
  events: AgentEvent[]
  output?: string
}

export interface PipelineState {
  stage: number
  agents: Record<AgentName, AgentState>
  writerDraft?: string
  voiceDraft?: string
  researchOutput?: string
  multiplexOutputs?: {
    tts?: string
    radio?: string
    carousel?: string[]
    heroClip?: string
  }
}
