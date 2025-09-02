import { profesionales } from "../constants/profesionales";
import "../styles/ProfesionalesInfo.css";

export default function ProfesionalesInfo({ onClose }) {
  return (
    <div className="service-profesionales service-profesionales--full">
      <button className="service-profesionales__close" onClick={onClose}>
        &times;
      </button>
      <h2 className="service-profesionales__title">Equipo Profesional</h2>
      <div className="service-profesionales__list">
        {profesionales.map((prof, idx) => (
          <div key={idx} className="service-profesionales__item">
            <div className="profesional-foto-wrapper">
              <img
                src={prof.foto}
                alt={prof.nombre}
                className="service-profesionales__foto"
              />
            </div>
            <div className="service-profesionales__info">
              <h3>{prof.nombre}</h3>
              <p className="profesional-cargo">
                <span className="profesional-icon">💼</span> {prof.cargo}
              </p>
              <p className="profesional-profesion">
                <span className="profesional-icon">🎓</span> {prof.profesion}
              </p>
              <p className="profesional-telefono">
                <span className="profesional-icon">📞</span> {prof.telefono}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
