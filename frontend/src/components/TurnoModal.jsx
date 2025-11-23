import React, { useState, useEffect } from 'react';
import moment from 'moment';
import Swal from 'sweetalert2';  // Agrega la importación de SweetAlert2
import './../styles/TurnoModal.css';

const parseProfesionalIds = (value) =>
  String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '');

export default function TurnoModal({ event, onClose, onUpdate, onDelete, onOpenPagos, onOpenPaciente, loggedInProfesionalId, isAdmin = false }) {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false); // Nuevo estado para el modal de cancelación
  const [cancelTexto, setCancelTexto] = useState(''); // Estado para el motivo

  useEffect(() => {
    if (event) {
      setStartTime(moment(event.start).format('HH:mm'));
      setEndTime(moment(event.end).format('HH:mm'));
    }
  }, [event]);

  if (!event) return null;

  const { data: turno } = event;
  const profesionalIds = parseProfesionalIds(turno.profesional_ids);
  const isMyEvent = profesionalIds.includes(String(loggedInProfesionalId));
  const canManageTurno = isAdmin || isMyEvent;
  const canDeleteTurno = isAdmin && typeof onDelete === 'function';

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
    if (status === 'cancelado') {
      setShowCancelModal(true); // Abre el modal de cancelación en lugar de window.confirm
      return;
    }
    const message = `¿Está seguro de que desea cambiar el estado a ${status.toUpperCase()}?`;
    if (window.confirm(message)) {
      onUpdate(event, { estado: status }, openPaymentModal);
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelTexto.trim()) {
      Swal.fire('Advertencia', 'Por favor, ingrese el texto para la cancelación.', 'warning');  // Cambia alert por Swal
      return;
    }
    const subject = `Cancelación de turno ${moment(event.start).format('DD/MM/YYYY')}`;
    const body = cancelTexto;
    console.log('Event:', event);  // Agrega para depurar
    console.log('ID del turno:', event.id);  // Verifica si event.id existe
    try {
      const response = await fetch(`http://localhost:3001/api/turnos/cancelar/${event.id}`, {  // Cambia event.data.id a event.id
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body }),
      });
      const result = await response.json();
      if (result.success) {
        Swal.fire('Éxito', 'Turno cancelado exitosamente. Se ha enviado un email al responsable.', 'success');  // Cambia alert por Swal
        onUpdate(event, { estado: 'cancelado' });
        setShowCancelModal(false);
        setCancelTexto('');
      } else {
        Swal.fire('Error', 'Error al cancelar turno: ' + result.message, 'error');  // Cambia alert por Swal
      }
    } catch (error) {
      console.error('Error en cancelación:', error);
      Swal.fire('Error', 'Error al cancelar turno', 'error');  // Cambia alert por Swal
    }
  };

  const handleCancelCancel = () => {
    setShowCancelModal(false);
    setCancelTexto('');
  };

  const handleDeleteTurno = () => {
    if (!canDeleteTurno) return;
    const message = '¿Está seguro de que desea eliminar este turno? Esta acción no se puede deshacer.';
    if (window.confirm(message)) {
      onDelete(event);
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
          {canManageTurno ? (
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
          {canDeleteTurno && (
            <div className="modal-admin-actions">
              <h3>Administrar</h3>
              <button className="btn-cancel" onClick={handleDeleteTurno}>Eliminar turno</button>
            </div>
          )}
        </div>
      </div>

      {/* Nuevo modal de cancelación */}
      {showCancelModal && (
        <div className="modal-backdrop" onClick={handleCancelCancel}>
          <div className="modal-content cancel-modal" onClick={e => e.stopPropagation()}>
            <h3>Cancelación de turno</h3>
            <label htmlFor="motivo">Motivo de la cancelación del turno</label>
            <textarea
              id="motivo"
              value={cancelTexto}
              onChange={(e) => setCancelTexto(e.target.value)}
              placeholder="Redacte el motivo aquí..."
              rows="4"
            />
            <div className="modal-buttons">
              <button className="btn-cancel2" onClick={handleCancelCancel}>Cancelar</button>
              <button className="btn-send" onClick={handleCancelSubmit}>Enviar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

