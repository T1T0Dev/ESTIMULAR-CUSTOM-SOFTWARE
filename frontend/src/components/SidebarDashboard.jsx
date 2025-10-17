import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/SidebarDashboard.css";

export default function SidebarDashboard() {
  const navigate = useNavigate();
  return (
    <aside className="sd-sidebar" aria-label="Sidebar de navegación">
      <div className="sd-top">
        <div className="sd-logo">Estimular</div>
      </div>

      <nav className="sd-nav">
        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) =>
            isActive ? "sd-link active" : "sd-link"
          }
        >
          🏠 Dashboard
        </NavLink>
        <NavLink
          to="/dashboard/turnos"
          className={({ isActive }) =>
            isActive ? "sd-link active" : "sd-link"
          }
        >
          📅 Turnos
        </NavLink>
        <NavLink
          to="/dashboard/ninos"
          className={({ isActive }) =>
            isActive ? "sd-link active" : "sd-link"
          }
        >
          👥 Niños
        </NavLink>
        <NavLink
          to="/dashboard/usuarios"
          className={({ isActive }) =>
            isActive ? "sd-link active" : "sd-link"
          }
        >
          👤 Usuarios
        </NavLink>
        <NavLink
          to="/dashboard/profesionales"
          className={({ isActive }) =>
            isActive ? "sd-link active" : "sd-link"
          }
        >
          🧑‍⚕️ Profesionales
        </NavLink>
        <NavLink
          to="/dashboard/entrevistas"
          className={({ isActive }) =>
            isActive ? "sd-link active" : "sd-link"
          }
        >
          📋 Entrevistas
        </NavLink>
        <NavLink
          to="/dashboard/obras-sociales"
          className={({ isActive }) =>
            isActive ? "sd-link active" : "sd-link"
          }
        >
          🏥 Obras sociales
        </NavLink>

        {/* Pacientes unificado en Niños */}
        <NavLink
          to="/dashboard/responsables"
          className={({ isActive }) =>
            isActive ? "sd-link active" : "sd-link"
          }
        >
          🧑‍👩‍👧 Responsables
        </NavLink>
      </nav>

      <div className="sd-user-card">
        <button
          className="sd-user-btn"
          onClick={() => navigate("/dashboard/editar-profesional")}
          aria-label="Editar perfil profesional"
        >
          <div className="sd-user-avatar" aria-hidden="true">
            NR
          </div>
          <div className="sd-user-info">
            <div className="sd-user-name">Noelia Robles</div>
            <div className="sd-user-role">Psicóloga</div>
            <div className="sd-user-email">noelia.robles@estimular.com</div>
          </div>
        </button>
      </div>

      <div className="sd-footer">
        <button className="sd-logout">Cerrar sesión</button>
      </div>
    </aside>
  );
}
