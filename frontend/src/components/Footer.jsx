import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import instagramIcon from "../assets/logo_instagram.jpg";
import facebookIcon from "../assets/logo_facebook.jpg";
import API_BASE_URL from "../constants/api";


import { profesionales } from "../constants/profesionales";

import "../styles/Footer.css";

export default function Footer() {

  const {telefono} = profesionales[0];

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

  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/contact`, form);

      if (res.data.success) {
        setStatus({ success: true, message: res.data.message });
        setForm({
          nombre: "",
          apellido: "",
          email: "",
          servicio: "",
          comentario: "",
        });
      } else {
        setStatus({ success: false, message: res.data.message });
      }
    } catch (err) {
      setStatus({
        success: false,
        message: err.response?.data?.message || "Error al enviar la consulta.",
      });
    }
  };

  return (
    <footer id="contact" className="footer">
      <div className="footer-bottom">
        <p>© {añoActual} Estimular. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
