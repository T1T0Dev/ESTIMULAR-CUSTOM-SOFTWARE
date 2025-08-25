
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import '../styles/Testimonials.css';


import persona1 from '../assets/persona_prueba1.png';
const data = [
  { 
    quote: '“Hemos visto un progreso increíble en nuestro hijo desde que comenzó la terapia.”', 
    name: 'Familia Pérez',
    image: persona1
  },
  {
    quote: '“El equipo es increíblemente atento y profesional.”',
    name: 'Familia Rodríguez',
    image: persona1
  },
  {
    quote: '“Recomendaría este centro a cualquier familia que busque apoyo.”',
    name: 'Familia Fernández',
    image: persona1
  },
];

export default function Testimonials() {
  return (
    <section id='testimonials' className="testimonials-section">
      <Swiper
        modules={[Pagination]}
        pagination={{ clickable: true }}
        spaceBetween={40}
        className="testimonials-swiper"
      >
        {data.map((testimon, idx) => (
          <SwiperSlide key={idx} className="testimonial-slide">
            <div className="testimonial-content">
              <blockquote className="testimonial-quote">
                {testimon.quote}
              </blockquote>
              {testimon.image && (
                <div className="testimonial-image">
                  <img src={testimon.image} alt={testimon.name} />
                </div>
              )}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
