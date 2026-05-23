import { useState } from "react"
import { Header } from "./components/Header"
import { CouncilView } from "./components/CouncilView"
import { DiffView } from "./components/DiffView"
import { MultiplexBoard } from "./components/MultiplexBoard"
import { useSSE } from "./hooks/useSSE"

type View = "council" | "diff" | "multiplex"

export default function App() {
  const [view, setView] = useState<View>("council")
  const { events, agents, isConnected } = useSSE()

  return (
    <div className="min-h-screen flex flex-col">
      <Header view={view} setView={setView} isConnected={isConnected} />
      <main className="flex-1 p-4">
        {view === "council" && <CouncilView agents={agents} events={events} />}
        {view === "diff" && <DiffView events={events} />}
        {view === "multiplex" && <MultiplexBoard events={events} />}
      </main>
    </div>
  )
}
