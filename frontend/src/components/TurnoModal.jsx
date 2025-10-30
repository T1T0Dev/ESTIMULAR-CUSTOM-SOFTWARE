import React, { useState, useEffect } from 'react';
import moment from 'moment';
import axios from 'axios';
import API_BASE_URL from '../constants/api';
import './../styles/TurnoModal.css';

export default function TurnoModal({ event, onClose, onUpdate, onOpenPagos, onOpenPaciente, loggedInProfesionalId }) {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (event) {
      setStartTime(moment(event.start).format('HH:mm'));
      setEndTime(moment(event.end).format('HH:mm'));
    }
  }, [event]);

  if (!event) return null;

  const { data: turno } = event;
  const isMyEvent = turno.profesional_ids?.split(',').includes(String(loggedInProfesionalId));

  const handleTimeSave = () => {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startMoment = moment(event.start)
      .clone()
      .set({ hour: startHour || 0, minute: startMinute || 0, second: 0, millisecond: 0 });

    const endMoment = moment(event.start)
      .clone()
      .set({ hour: endHour || 0, minute: endMinute || 0, second: 0, millisecond: 0 });

    if (endMoment.isSameOrBefore(startMoment)) {
      endMoment.add(30, 'minutes');
    }

    onUpdate(event, { inicio: startMoment.toISOString(), fin: endMoment.toISOString() });
  };

  const handleChangeDay = () => {
    alert('Funcionalidad para cambiar el día no implementada aún.');
  };

  const createStatusHandler = (status, openPaymentModal = false) => () => {
    const message = `¿Está seguro de que desea cambiar el estado a ${status.toUpperCase()}?`;
    if (window.confirm(message)) {

      onUpdate(event, { estado: status }, openPaymentModal);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>&times;</button>
        
        <div className="modal-header">
          <img 
            src={`/pacientes/${turno.paciente_dni}.jpg`} 
            alt={`Foto de ${turno.paciente_nombre}`}
            className="modal-patient-img"
            onError={(e) => { e.target.onerror = null; e.target.src='/src/assets/persona_prueba1.png'}} // Fallback image
          />
          <div className="modal-patient-info">
            <h2>{turno.paciente_nombre} {turno.paciente_apellido}</h2>
            <p>Nacimiento: {moment(turno.paciente_fecha_nacimiento).format('DD/MM/YYYY')}</p>
            <p>Servicio: {turno.servicio_nombre}</p>
            <button className="btn-view-patient" onClick={() => onOpenPaciente(turno)}>Ver Ficha</button>
          </div>
        </div>

        <div className="modal-body">
          {isMyEvent ? (
            <>
              <h3>Cambiar Estado</h3>
              <div className="modal-actions-grid">
                <button className="btn-confirm" onClick={createStatusHandler('confirmado')} disabled={turno.estado === 'confirmado'}>Confirmar</button>
                <button className="btn-asistencia" onClick={createStatusHandler('completado', true)} disabled={turno.estado === 'completado'}>Asistencia</button>
                <button className="btn-no-show" onClick={createStatusHandler('no_presento')} disabled={turno.estado === 'no_presento'}>No se Presentó</button>
                <button className="btn-pending" onClick={createStatusHandler('pendiente')} disabled={turno.estado === 'pendiente'}>Pendiente</button>
                <button className="btn-cancel" onClick={createStatusHandler('cancelado')} disabled={turno.estado === 'cancelado'}>Cancelar</button>
                <button className="btn-view-payments" onClick={() => onOpenPagos(event)}>Ver Pagos</button>
              </div>

              <h3>Reagendar</h3>
              <div className="modal-form-inline">
                <div className="time-inputs">
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                  <span>-</span>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
                <button className="btn-save" onClick={handleTimeSave}>Guardar Hora</button>
              </div>
              <button className="btn-change-day" onClick={handleChangeDay}>Cambiar Día</button>
            </>
          ) : (
            <p>No tiene permisos para modificar este turno.</p>
          )}
        </div>
      </div>
    </div>
  );
}

