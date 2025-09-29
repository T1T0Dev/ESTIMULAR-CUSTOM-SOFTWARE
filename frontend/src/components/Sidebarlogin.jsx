import React from 'react'
import logoEstimular from "../assets/logo_estimular.png";
import "../styles/Sidebarlogin.css";

export default function Sidebarlogin() {
  return (
    <div className="barra-lateral-login">
      <div className="sidebarlogin__content">
        <h2 className="sidebarlogin__bienvenida">
          Bienvenido a <br /> Estimular
        </h2>
        <img
          src={logoEstimular}
          alt="Logo Estimular"
          className="sidebarlogin__logo"
        />
        <h1 className="sidebarlogin__titulo">ESTIMULAR</h1>
        <p className="sidebarlogin__eslogan">
          Cada niño merece<br />ser escuchado
        </p>
      </div>
    </div>
  )
}

