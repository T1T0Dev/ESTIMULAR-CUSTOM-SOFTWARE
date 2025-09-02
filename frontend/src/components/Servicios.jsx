import { useState } from "react";
import { items } from "../constants/items";
import { getIcon } from "../constants/iconos";
import ProfesionalesInfo from "./ProfesionalesInfo";
import "../styles/Servicios.css";

export default function Servicios() {
  const [activeIdx, setActiveIdx] = useState(null);

  const handleItemClick = (idx) => {
    setActiveIdx(idx);
  };

  const handleClose = () => {
    setActiveIdx(null);
  };

  return (
    <section id="services" className="services-section">
      <h2 className="services-title">Nuestros Servicios</h2>
      <div className="services-list">
        {activeIdx === null
          ? items.map((item, idx) => (
              <div
                key={idx}
                className={`service-item${
                  activeIdx === idx ? " service-item--active" : ""
                }`}
                onClick={() => handleItemClick(idx)}
                style={{ transition: "all 0.4s cubic-bezier(.4,0,.2,1)" }}
              >
                <div className={item.iconClass}>{getIcon(item.iconType)}</div>
                <h3 className="service-name">{item.title}</h3>
                <ul className="service-desc">
                  {item.desc.map((descItem, index) => (
                    <li key={index}>{descItem}</li>
                  ))}
                </ul>
              </div>
            ))
          : (
            <ProfesionalesInfo
              onClose={handleClose}
            />
          )}
      </div>
    </section>
  );
}
