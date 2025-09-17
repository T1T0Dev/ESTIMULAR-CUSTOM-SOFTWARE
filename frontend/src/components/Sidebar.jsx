import React from "react";
import logoEstimular from "../assets/logo_estimular.png";
import InformacionContacto from '../components/InformacionContacto'

import "../styles/Sidebar.css";

export default function Sidebar() {
  return (
    <div className="barra-lateral">
      <aside className="barra-lateral__aside">
        <img
          src={logoEstimular}
          alt="Logo Estimular"
          className="barra-lateral__logo"
        />
      </aside>
       <div className="barra-lateral__info">
          <h1 className="barra-lateral__marca">ESTIMULAR</h1>
          <h2 className="barra-lateral__frase">
            Hace mas de 5 años brindando el mejor servicio para vos y para tu familia.
          </h2>
        </div>
      <div>
        <InformacionContacto/>
      </div>
    </div>
  );
}