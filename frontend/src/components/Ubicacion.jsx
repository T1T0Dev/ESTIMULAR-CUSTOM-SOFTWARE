import React from "react";
import '../styles/Ubicacion.css';
import empresaImg from '../assets/estimular_ubicacion.jpeg';

export default function Ubicacion() {
  return (
    <section className="ubicacion-section" id="ubicacion">
      <div className="ubicacion-content">
        <div className="ubicacion-img-container">
          <img src={empresaImg} alt="Foto del Centro Estimular" className="ubicacion-img" />
        </div>
        <div className="ubicacion-info">
          <h2 className="ubicacion-title">¿Dónde estamos?</h2>
          <p className="ubicacion-desc">
            Nos encontramos en Las Heras 132 , San Miguel de Tucuman.<br />
            Nuestro centro cuenta con instalaciones modernas y accesibles para todos.
          </p>
          <iframe
            title="Ubicación Estimular"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3560.2037854476152!2d-65.20677532663423!3d-26.833469938369163!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94225c056769c887%3A0x2a514c2ec9f937ba!2sJuan%20Gregorio%20de%20las%20Heras%20132%2C%20T4000%20San%20Miguel%20de%20Tucum%C3%A1n%2C%20Tucum%C3%A1n!5e0!3m2!1ses-419!2sar!4v1756078240148!5m2!1ses-419!2sar"
            width="100%"
            height="300"
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </div>
    </section>
  );
}


