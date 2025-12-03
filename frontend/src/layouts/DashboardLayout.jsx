import React, { useState } from "react";
import SidebarDashboard from "../components/SidebarDashboard";
import BottomNavigation from "../components/BottomNavigation";
import "../styles/DashboardLayout.css";
// Importar iconos de apertura/cierre si es necesario
import { FaBars, FaTimes } from "react-icons/fa";

export default function DashboardLayout({ children, title }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`dashboard-layout${collapsed ? " collapsed" : ""}`}>
      <aside className="dashboard-sidebar" aria-label="Navegación principal">
        <SidebarDashboard />
      </aside>

      {/* Toggle tipo "cortina" para desktop */}
      <button
        className={`dashboard-toggle-curtain ${
          collapsed ? "is-collapsed" : "is-open"
        }`}
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Abrir sidebar" : "Cerrar sidebar"}
        aria-expanded={!collapsed}
        title={collapsed ? "Abrir sidebar" : "Cerrar sidebar"}
        type="button"
      >
        {/* Utilizar iconos de apertura/cierre */}
        {collapsed ? <FaBars /> : <FaTimes />}
      </button>

      {/* Botón hamburguesa para móviles */}
      <button
        className="dashboard-mobile-menu"
        onClick={() => setCollapsed((c) => !c)}
        aria-label="Menú de navegación"
        type="button"
      >
        <FaBars />
      </button>

      <main className="dashboard-main" role="main">
        {title && (
          <div className="dashboard-title">
            <h2>{title}</h2>
          </div>
        )}
        <div className="dashboard-content">{children}</div>
      </main>

      {/* Bottom Navigation para móviles */}
      <BottomNavigation />
    </div>
  );
}
