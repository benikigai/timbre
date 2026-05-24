import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DemoPage from "./pages/DemoPage";

export default function App() {
  return (
    <BrowserRouter basename="/app">
      <Routes>
        {/* / — locked cached demo (safe surface for judges) */}
        <Route path="/" element={<DemoPage mode="cached" />} />
        {/* /live — full live playground (Scout candidates, live Gemini APIs, refine inputs) */}
        <Route path="/live" element={<DemoPage mode="live" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
