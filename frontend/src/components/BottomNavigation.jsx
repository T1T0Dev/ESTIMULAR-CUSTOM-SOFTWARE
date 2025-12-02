import React from "react";
import { NavLink } from "react-router-dom";
import {
  MdDashboard,
  MdEventAvailable,
  MdGroups,
  MdPerson,
  MdAssignment,
  MdLocalHospital,
  MdFamilyRestroom,
  MdAttachMoney,
} from "react-icons/md";
import "../styles/BottomNavigation.css";
import useAuthStore from "../store/useAuthStore";

export default function BottomNavigation() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  const esAdmin = React.useMemo(() => {
    if (profile?.es_admin || user?.es_admin) return true;
    const names = [];
    if (user?.rol_nombre) names.push(user.rol_nombre);
    if (Array.isArray(user?.roles)) {
      names.push(
        ...user.roles
          .map((r) => r?.nombre)
          .filter((value) => typeof value === "string")
      );
    }
    return names
      .map((value) => value.toLowerCase())
      .some((value) => value.includes("admin") || value.includes("administr"));
  }, [profile?.es_admin, user?.es_admin, user?.rol_nombre, user?.roles]);

  const isProfesional = React.useMemo(() => {
    const names = [];
    if (user?.rol_nombre) names.push(user.rol_nombre);
    if (Array.isArray(user?.roles)) {
      names.push(
        ...user.roles
          .map((r) => r?.nombre)
          .filter((value) => typeof value === "string")
      );
    }
    return names
      .map((value) => value.toLowerCase())
      .some((value) => value.includes("profesional"));
  }, [user?.rol_nombre, user?.roles]);

  const navigationItems = [
    {
      to: "/dashboard",
      icon: MdDashboard,
      label: "Inicio",
      show: true,
    },
    {
      to: "/dashboard/ninos",
      icon: MdGroups,
      label: "Niños",
      show: true,
    },
    {
      to: "/dashboard/turnos",
      icon: MdEventAvailable,
      label: "Turnos",
      show: true,
    },
    {
      to: "/dashboard/obras-sociales",
      icon: MdLocalHospital,
      label: "Obras",
      show: true, // Mostrar para todos
    },
    {
      to: "/dashboard/entrevistas",
      icon: MdAssignment,
      label: "Entrevistas",
      show: esAdmin, // Solo para admins
    },
    {
      to: "/dashboard/responsables",
      icon: MdFamilyRestroom,
      label: "Resp.",
      show: esAdmin,
    },
    {
      to: "/dashboard/pagos",
      icon: MdAttachMoney,
      label: "Pagos",
      show: esAdmin,
    },
  ].filter(item => item.show);

  return (
    <nav className="bottom-navigation">
      <div className="bottom-navigation__container">
        {navigationItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/dashboard"} // Solo "Inicio" debe ser exacto
            className={({ isActive }) =>
              `bottom-navigation__item ${isActive ? 'bottom-navigation__item--active' : ''}`
            }
          >
            <item.icon className="bottom-navigation__icon" />
            <span className="bottom-navigation__label">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}