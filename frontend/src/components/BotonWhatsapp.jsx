import React from 'react'


import { profesionales } from '../constants/profesionales';

import '../styles/BotonWhatsapp.css';
import whatsappIcon from '../assets/whatsapp_button.jpeg';

// Luego los datos sensibles traerlos desde un archivo de configuración
// import {numeroTelefono, mensajePredeterminado} from '../config/whatsappConfig';

export default function WhatsappButton() {

  const numeroTelefono = "549" + profesionales[0].telefono.replace(/\D/g, ''); // Reemplaza con el número de teléfono real
  const mensaje = "Hola, tengo interés en sus servicios. Me gustaría obtener más información."

  return (
    <a
      href={`https://wa.me/${numeroTelefono}?text=${encodeURIComponent(mensaje)}`}
      className="whatsapp_float"
      target="_blank"
      rel="noopener noreferrer"
    >
      <img src={whatsappIcon} alt="WhatsApp" className="whatsapp-icon" />
    </a>
  )
}
