import React from "react";
import logoEstimular from "../assets/logo_estimular.png";
import "../styles/SobreEstimular.css";

export default function SobreEstimular() {
  return (
    <div className="seccion-sobre-estimular">
      <div className="contenedor-logo">
        <img
          src={logoEstimular}
          alt="Logo de Estimular"
          className="logo-estimular"
        />
      </div>
      <div className="contenido-sobre-estimular">
        <h2 className="titulo-sobre-estimular">Centro Terapéutico Estimular</h2>
        <p>
          Estimular nace con la finalidad de dar respuesta a niños y
          adolescentes con desafíos en el desarrollo o en el neurodesarrollo,
          ayudándolos a mejorar su calidad de vida y desarrollo personal, tanto
          físico como mental.
        </p>
        <ul className="lista-sobre-estimular">
          <li>Psicólogos</li>
          <li>Psicopedagogos</li>
          <li>Terapeutas Ocupacionales</li>
          <li>Fonoaudiólogos</li>
        </ul>
        <p className="nota-sobre-estimular">
          Nuestro equipo brinda atención personalizada y estrategias de abordaje
          para cada paciente y su familia. <br />
          <span className="texto-acento-rosa">
            Se atienden diversas obras sociales.
          </span>
        </p>
      </div>
    </div>
  );
}
