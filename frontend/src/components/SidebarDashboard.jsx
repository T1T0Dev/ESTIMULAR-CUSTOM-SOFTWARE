import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  MdDashboard,
  MdEventAvailable,
  MdGroups,
  MdPerson,
  MdAssignment,
  MdLocalHospital,
  MdFamilyRestroom,
} from "react-icons/md";
import "../styles/SidebarDashboard.css";
import useAuthStore from "../store/useAuthStore";

export default function SidebarDashboard() {
  const navigate = useNavigate();

  // ✅ Selectores separados (evita crear un objeto nuevo en cada render)
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const fullName = React.useMemo(() => {
    return [profile?.nombre, profile?.apellido]
      .filter(Boolean)
      .join(" ")
      .trim();
  }, [profile?.nombre, profile?.apellido]);

  const displayName = fullName || (user?.dni ? `DNI ${user.dni}` : "Usuario");
  const primaryRole = React.useMemo(() => {
    // 1) Profesión del perfil profesional si existe
    if (profile?.profesion) return profile.profesion;
    if (profile?.departamento?.nombre) return profile.departamento.nombre;
    // 2) Rol asignado desde backend (string plano)
    if (user?.rol_nombre) return user.rol_nombre;
    // 3) Roles múltiples (si existen)
    if (Array.isArray(user?.roles) && user.roles.length > 0) {
      const names = user.roles.map((r) => r?.nombre).filter(Boolean);
      if (names.length) return names.join(", ");
    }
    return null;
  }, [
    profile?.profesion,
    profile?.departamento?.nombre,
    user?.rol_nombre,
    user?.roles,
  ]);
  const displayRole = primaryRole || "Rol no asignado";
  const displayEmail = profile?.email || "Sin email";

  const initials = React.useMemo(() => {
    if (fullName) {
      const parts = fullName.split(" ").filter(Boolean);
      const first = parts[0]?.[0] || "";
      const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
      const combined = `${first}${last}`.trim();
      return combined ? combined.toUpperCase() : "US";
    }
    if (user?.dni) {
      const dniStr = String(user.dni);
      return dniStr.slice(-2).toUpperCase();
    }
    return "US";
  }, [fullName, user?.dni]);

  const handleLogout = React.useCallback(() => {
    clearAuth();
    navigate("/login", { replace: true });
  }, [clearAuth, navigate]);

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
          <MdFamilyRestroom size={18} /> <span>Padres/Tutores</span>
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
            disabled={!user}
          >
            <div className="sd-user-avatar" aria-hidden="true">
              {initials}
            </div>
            <div className="sd-user-info">
              <div className="sd-user-name">{displayName}</div>
              <div className="sd-user-role">{displayRole}</div>
              <div className="sd-user-email">{displayEmail}</div>
            </div>
          </button>
        </div>
        <button className="sd-logout" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
