import "../styles/InformacionContacto.css";
import instagramIcon from "../assets/logo_instagram.jpg";
import facebookIcon from "../assets/logo_facebook.jpg";

import { FaPhoneAlt } from "react-icons/fa";

import { profesionales } from "../constants/profesionales";


export default function InformacionContacto() {

  const { telefono } = profesionales[0];

  return (
    <div>
      <button className="footer-contact-btn">CONTACTO</button>
      <p className="footer-desc">
        Para más información, consultas o turnos, te asesoramos ante cualquier
        inquietud, nos podés encontrar en :
      </p>

      <div className="footer-phone-row">
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
        <span>
          <FaPhoneAlt />
        </span>
        <span className="footer-phone">{telefono} </span>
      </div>
    </div>
  );
}
