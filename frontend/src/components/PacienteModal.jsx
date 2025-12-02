import React from 'react';
import moment from 'moment';
import Swal from 'sweetalert2';
import './../styles/PacienteModal.css';
import API_BASE_URL from "../constants/api";

const calculateAge = (birthDate) => {
  if (!birthDate) return 'N/A';
  return moment().diff(birthDate, 'years');
};

export default function PacienteModal({ paciente, onClose }) {
  if (!paciente) return null;

  const handleVerDocumentos = () => {
    Swal.fire({
      icon: 'info',
      title: 'Función no implementada',
      text: 'Esta funcionalidad estará disponible próximamente.'
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="paciente-modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>&times;</button>
        <button className="modal-close-btn-mobile" onClick={onClose}>✕ Cerrar</button>
        
        <div className="paciente-modal-header">
          <div className="paciente-avatar-container">
            <img 
              src={API_BASE_URL+`/documentos/${paciente.paciente_dni}.jpg`} 
              alt={`Foto de ${paciente.paciente_nombre}`}
              className="paciente-profile-img"
              onError={(e) => { e.target.onerror = null; e.target.src='/src/assets/persona_prueba1.png'}} // Fallback
            />
          </div>
          <div className="paciente-details">
            <h2 className="paciente-nombre">{paciente.paciente_nombre} {paciente.paciente_apellido}</h2>
            <div className="paciente-info-grid">
              <div className="info-item">
                <p><strong>Edad:</strong> {calculateAge(paciente.paciente_fecha_nacimiento)} años</p>
              </div>
              <div className="info-item">
                <p><strong>Nacimiento:</strong> {moment(paciente.paciente_fecha_nacimiento).format('DD/MM/YYYY')}</p>
              </div>
              <div className="info-item">
                <p><strong>DNI:</strong> {paciente.paciente_dni}</p>
              </div>
              <div className="info-item">
                <p><strong>Teléfono:</strong> {paciente.telefono || 'N/A'}</p>
              </div>
              <div className="info-item">
                <p><strong>Email:</strong> {paciente.email || 'N/A'}</p>
              </div>
              <div className="info-item">
                <p><strong>Titular:</strong> {paciente.titular_nombre || 'N/A'}</p>
              </div>
              <div className="info-item">
                <p><strong>Obra Social:</strong> {paciente.obra_social || 'N/A'}</p>
              </div>
              <div className="info-item">
                <p><strong>CUD:</strong> {paciente.cud || 'No posee'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="paciente-modal-actions">
          <button className="btn-view-docs" onClick={handleVerDocumentos}>
            📄 Ver Documentos
          </button>
        </div>
      </div>
    </div>
  );
}
