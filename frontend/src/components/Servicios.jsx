import { items } from "../constants/items";
import { getIcon } from "../constants/iconos";
import "../styles/Servicios.css";

export default function Servics() {
  return (
    <section id="services" className="services-section">
      <h2 className="services-title">Nuestros Servicios</h2>
      <div className="services-list">
        {items.map((item, idx) => (
          <div key={idx} className="service-item">
            <div className={item.iconClass}>{getIcon(item.iconType)}</div>
            <h3 className="service-name">{item.title}</h3>
            <ul className="service-desc">
              {item.desc.map((descItem, index) => (
                <li key={index}>{descItem}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
