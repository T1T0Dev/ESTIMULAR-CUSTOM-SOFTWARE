import { Outlet, Routes, Route, Navigate } from "react-router-dom";
import SidebarDashboard from "../components/SidebarDashboard";

export default function Dashboard() {
  return (
    <div className="sd-layout">
      <SidebarDashboard />
      <main className="sd-content">
        <Routes>
          <Route
            path="/"
            element={<div className="p-24">Bienvenido al Dashboard</div>}
          />
          {/* Candidatos eliminado: usar Niños */}
          <Route
            path="entrevistas"
            element={
              <div className="p-24">Listado de entrevistas (placeholder)</div>
            }
          />
          <Route
            path="obras-sociales"
            element={<div className="p-24">Obras sociales (placeholder)</div>}
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
