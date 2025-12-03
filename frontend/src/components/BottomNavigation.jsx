import React, { useState } from "react";
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
  MdAccountBalanceWallet,
  MdMoreHoriz,
  MdClose,
} from "react-icons/md";
import "../styles/BottomNavigation.css";
import useAuthStore from "../store/useAuthStore";

export default function BottomNavigation() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

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

  const isRecepcion = React.useMemo(() => {
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
      .some((value) => value.includes("recepcion") || value.includes("recepción"));
  }, [user?.rol_nombre, user?.roles]);

  const allNavigationItems = [
    {
      to: "/dashboard",
      icon: MdDashboard,
      label: "Inicio",
      show: true,
      priority: 1,
    },
    {
      to: "/dashboard/ninos",
      icon: MdGroups,
      label: "Niños",
      show: true,
      priority: 1,
    },
    {
      to: "/dashboard/turnos",
      icon: MdEventAvailable,
      label: "Turnos",
      show: true,
      priority: 1,
    },
    {
      to: "/dashboard/obras-sociales",
      icon: MdLocalHospital,
      label: "Obras",
      show: true,
      priority: 2,
    },
    {
      to: "/dashboard/profesionales",
      icon: MdPerson,
      label: "Equipo",
      show: esAdmin,
      priority: 2,
    },
    {
      to: "/dashboard/responsables",
      icon: MdFamilyRestroom,
      label: "Padres",
      show: esAdmin || isRecepcion,
      priority: 2,
    },
    {
      to: "/dashboard/entrevistas",
      icon: MdAssignment,
      label: "Entrevistas",
      show: esAdmin,
      priority: 2,
    },
    {
      to: "/dashboard/pagos",
      icon: MdAccountBalanceWallet,
      label: "Pagos",
      show: esAdmin || isProfesional || isRecepcion,
      priority: 2,
    },
    {
      to: "/dashboard/finanzas",
      icon: MdAttachMoney,
      label: "Finanzas",
      show: esAdmin,
      priority: 2,
    },
  ].filter(item => item.show);

  // Items principales (los primeros 3 más importantes)
  const mainItems = allNavigationItems.slice(0, 3);
  
  // Items para el menú "Más" (todos los demás)
  const moreItems = allNavigationItems.slice(3);
  
  // Siempre mostrar el botón "Más" si hay más items
  const showMoreButton = moreItems.length > 0;

  return (
    <>
      {/* Modal lateral para las opciones adicionales */}
      {showMoreMenu && (
        <>
          <div 
            className="bottom-navigation__modal-overlay"
            onClick={() => setShowMoreMenu(false)}
          />
          <div className="bottom-navigation__modal">
            <div className="bottom-navigation__modal-header">
              <h3>
                <MdMoreHoriz style={{ marginRight: '8px' }} />
                Más opciones
              </h3>
              <button 
                className="bottom-navigation__modal-close"
                onClick={() => setShowMoreMenu(false)}
                aria-label="Cerrar menú"
              >
                <MdClose size={20} />
              </button>
            </div>
            <div className="bottom-navigation__modal-content">
              {moreItems.length > 0 ? (
                moreItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/dashboard"}
                    className={({ isActive }) =>
                      `bottom-navigation__modal-item ${isActive ? 'bottom-navigation__modal-item--active' : ''}`
                    }
                    onClick={() => setShowMoreMenu(false)}
                  >
                    <item.icon className="bottom-navigation__modal-icon" />
                    <span className="bottom-navigation__modal-label">{item.label}</span>
                  </NavLink>
                ))
              ) : (
                <div className="bottom-navigation__modal-empty">
                  No hay más opciones disponibles
                </div>
              )}
            </div>
          </div>
        </>
      )}
      <nav className="bottom-navigation">
        <div className="bottom-navigation__container">
          {mainItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/dashboard"}
              className={({ isActive }) =>
                `bottom-navigation__item ${isActive ? 'bottom-navigation__item--active' : ''}`
              }
            >
              <item.icon className="bottom-navigation__icon" />
              <span className="bottom-navigation__label">{item.label}</span>
            </NavLink>
          ))}
          
          {showMoreButton && (
            <div className="bottom-navigation__more-container">
              <div
                className={`bottom-navigation__item bottom-navigation__more-btn ${showMoreMenu ? 'bottom-navigation__item--active' : ''}`}
                onClick={() => setShowMoreMenu(!showMoreMenu)}
              >
                <MdMoreHoriz className="bottom-navigation__icon" />
                <span className="bottom-navigation__label">Más</span>
                {showMoreMenu && <div className="bottom-navigation__more-indicator"></div>}
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}