import React from "react";
import logoEstimular from "../assets/logo_estimular.png";
import "../styles/AboutEstimular.css";


export default function AboutEstimular() {
  return (
    <div className="about-estimular-section">
      <div className="logo-container">
        <img src={logoEstimular} alt="Logo de Estimular" className="logo" />
      </div>
      <div className="about-estimular">
        <h2 className="about-title">Centro Terapéutico Estimular</h2>
        <p>
          Estimular nace con la finalidad de dar respuesta a personas con discapacidad, ayudándolas a mejorar su calidad de vida y desarrollo personal, tanto físico como mental.
        </p>
        <ul className="about-list">
          <li>Psicólogos</li>
          <li>Psicopedagogos</li>
          <li>Terapeutas Ocupacionales</li>
          <li>Fonoaudiólogos</li>
          <li>Psicomotricistas</li>
        </ul>
        <p className="about-note">
          Nuestro equipo interdisciplinario brinda atención personalizada y estrategias de abordaje para cada paciente. <br />
          Se atienden todas las obras sociales.
        </p>
      </div>
    </div>
  );
}
