// src/components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import {useNavigate } from 'react-router-dom';
import {
 FaHome, 
  FaConciergeBell, 
  FaComments, 
  FaImages, 
  FaEnvelope, 
  FaClipboardList 
} from "react-icons/fa";



import '../styles/Navbar.css';

export default function Navbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}>
      <div className="navbar__container">
        <a href="#home" className="navbar__logo">Estimular</a>

        <input type="checkbox" id="nav-toggle" className="navbar__toggle" />
        <label htmlFor="nav-toggle" className="navbar__hamburger">
          <span></span>
          <span></span>
          <span></span>
        </label>

        <ul className="navbar__menu">
          <li><a href="#home"><FaHome/> Home</a></li>
          <li><a href="#services"><FaConciergeBell/> Servicios</a></li>
          <li><a href="#testimonials"><FaComments/> Testimonios</a></li>
          <li><a href="#gallery"><FaImages/> Galería</a></li>
          <li><a href="#contact"><FaEnvelope/> Contacto</a></li>
          <li className="navbar__cta" onClick={() => navigate('/formulario-entrevista')}> <a> <FaClipboardList/> Solicitar Entrevista </a></li>
        </ul>
      </div>
    </nav>
  );
}
// 