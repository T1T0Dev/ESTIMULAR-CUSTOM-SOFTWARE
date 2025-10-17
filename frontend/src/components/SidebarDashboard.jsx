import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  MdDashboard,
  MdPeople,
  MdEventAvailable,
  MdGroups,
  MdPerson,
  MdAssignment,
  MdLocalHospital,
  MdFamilyRestroom,
} from "react-icons/md";
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
          <MdDashboard size={18} /> <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/dashboard/turnos"
          className={({ isActive }) =>
            isActive ? "sd-link active" : "sd-link"
          }
        >
          <MdEventAvailable size={18} /> <span>Turnos</span>
        </NavLink>

        {/* Relacionados 1:1 */}
        <NavLink
          to="/dashboard/usuarios"
          className={({ isActive }) =>
            isActive ? "sd-link active" : "sd-link"
          }
        >
          <MdPeople size={18} /> <span>Usuarios</span>
        </NavLink>

        <NavLink
          to="/dashboard/profesionales"
          className={({ isActive }) =>
            isActive ? "sd-link active" : "sd-link"
          }
        >
          <MdGroups size={18} /> <span>Equipo Estimular</span>
        </NavLink>

        {/* Entidades relacionadas entre sí */}
        <NavLink
          to="/dashboard/ninos"
          className={({ isActive }) =>
            isActive ? "sd-link active" : "sd-link"
          }
        >
          <MdPerson size={18} /> <span>Niños</span>
        </NavLink>

        <NavLink
          to="/dashboard/responsables"
          className={({ isActive }) =>
            isActive ? "sd-link active" : "sd-link"
          }
        >
          <MdFamilyRestroom size={18} /> <span>Responsables</span>
        </NavLink>

        <NavLink
          to="/dashboard/entrevistas"
          className={({ isActive }) =>
            isActive ? "sd-link active" : "sd-link"
          }
        >
          <MdAssignment size={18} /> <span>Entrevistas</span>
        </NavLink>

        <NavLink
          to="/dashboard/obras-sociales"
          className={({ isActive }) =>
            isActive ? "sd-link active" : "sd-link"
          }
        >
          <MdLocalHospital size={18} /> <span>Obras sociales</span>
        </NavLink>
      </nav>

      <div className="sd-footer">
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
        <button className="sd-logout">Cerrar sesión</button>
      </div>
    </aside>
  );
}
