
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/autoplay';

import imagen1 from '../assets/imagen_prueba1.jpg';
import imagen2 from '../assets/imagen_prueba2.jpg'; 
import imagen3 from '../assets/imagen_prueba3.jpg';

import { useNavigate } from 'react-router-dom';

import '../styles/Hero.css';

export default function Hero() {

  const navigate = useNavigate();

  return (
    <section id="home" className="hero-section">
      <Swiper
        modules={[Navigation, Autoplay]}
        navigation
        autoplay={{ delay: 5000 }}
        className="hero-swiper"
      >
        {[imagen1, imagen2, imagen3].map((src, idx) => (
          <SwiperSlide key={idx} className="hero-slide">
            <img
              src={src}
              alt={`Slide ${idx + 1}`}
              loading="lazy"
              onError={(e) => (e.currentTarget.src = '/fallback.jpg')}
            />
          </SwiperSlide>
        ))}
      </Swiper>

      <div className="hero-overlay improved">
        <div className="hero-content">
          <h2 className="hero-brand">Estimular</h2>
          <h1 className="hero-title">Centro Terapéutico Infanto Juvenil</h1>
          <p className="hero-subtitle">
            Brindamos apoyo especializado para el desarrollo y bienestar de niños y adolescentes
          </p>
          <a className="hero-button" onClick={() => navigate('/formulario-entrevista')}> 
            Solicitar primera entrevista
          </a>
        </div>
      </div>
    </section>
  );
}