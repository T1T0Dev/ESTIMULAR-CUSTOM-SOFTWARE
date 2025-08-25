import { useState } from "react";
import instagramIcon from "../assets/logo_instagram.jpg";
import facebookIcon from "../assets/logo_facebook.jpg";
import "../styles/Footer.css";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    servicio: "",
    comentario: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("¡Gracias por tu consulta!");
  };

  return (
    <footer id="contact" className="footer">
      <div className="footer-content">
        <div className="footer-left">
          <button className="footer-contact-btn">CONTACTO</button>
          <p className="footer-desc">
            Ponete en contacto con nosotros, te asesoramos ante cualquier
            inquietud,
            <br />
            nos podés encontrar en
          </p>
          <div className="footer-phone-row">
            <span className="footer-phone-icon">📞</span>
            <span className="footer-phone">4227070 / 3813390033</span>
          </div>
          <h4 className="footer-social-title">NUESTRAS REDES</h4>
          <div className="footer-social-icons">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-icon fb"
              aria-label="Facebook"
            >
              <img
                src={facebookIcon}
                alt="Facebook"
                className="footer-img-icon"
              />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-icon ig"
              aria-label="Instagram"
            >
              <img
                src={instagramIcon}
                alt="Instagram"
                className="footer-img-icon"
              />
            </a>
          </div>
        </div>
        <div className="footer-right">
          <form className="footer-form" onSubmit={handleSubmit}>
            <div className="footer-form-row">
              <div>
                <label className="footer-form-label">Nombre</label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="footer-form-label">Apellidos</label>
                <input
                  type="text"
                  name="apellido"
                  value={form.apellido}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <label className="footer-form-label">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
            <label className="footer-form-label">Interesado en</label>
            <select
              name="servicio"
              value={form.servicio}
              onChange={handleChange}
              required
            >
              <option value="">Selecciona una opción</option>
              <option value="estimulación">Estimulación temprana</option>
              <option value="terapia">Terapia individual</option>
              <option value="apoyo">Apoyo familiar</option>
            </select>
            <label className="footer-form-label">Comentario</label>
            <textarea
              name="comentario"
              value={form.comentario}
              onChange={handleChange}
              rows={4}
            />
            <button type="submit" className="footer-form-btn">
              Enviar
            </button>
          </form>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {currentYear} Estimular. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
