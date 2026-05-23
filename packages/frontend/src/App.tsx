import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DemoPage from "./pages/DemoPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DemoPage />} />
        <Route path="/demo" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
