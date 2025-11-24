import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import axios from 'axios';
import API_BASE_URL from '../constants/api';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import '../styles/Turnos.css'; // Importar los estilos personalizados

import TurnoModal from './TurnoModal';
import PagoModal from './PagoModal';
import PacienteModal from './PacienteModal';
import NuevoTurnoPanel from './NuevoTurnoPanel';

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

const parseProfesionalIds = (value) =>
  String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '');

const roundToNearestMinutes = (date, intervalMinutes) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }
  const intervalMs = intervalMinutes * 60 * 1000;
  const roundedTime = Math.round(date.getTime() / intervalMs) * intervalMs;
  return new Date(roundedTime);
};

const intersectsLunchBreak = (start, end = null) => {
  if (!start) return false;

  const windowStart = moment(start).clone().hours(13).minutes(0).seconds(0).milliseconds(0);
  const windowEnd = moment(start).clone().hours(14).minutes(0).seconds(0).milliseconds(0);

  const startMoment = moment(start);
  if (!end) {
    return startMoment.isSameOrAfter(windowStart) && startMoment.isBefore(windowEnd);
  }

  const endMoment = moment(end);
  if (!endMoment.isValid()) {
    return startMoment.isSameOrAfter(windowStart) && startMoment.isBefore(windowEnd);
  }

  return startMoment.isBefore(windowEnd) && endMoment.isAfter(windowStart);
};

const HIDDEN_SLOT_STYLE = Object.freeze({
  display: 'none',
  height: 0,
  minHeight: 0,
  padding: 0,
  border: 'none',
  margin: 0,
});

// --- Componentes Personalizados ---

const StatusLegend = () => {
  const statuses = [
    { name: 'Confirmado', class: 'confirmado' },
    { name: 'Pendiente', class: 'pendiente' },
    { name: 'Cancelado', class: 'cancelado' },
    { name: 'No Presentó', class: 'no_presento' },
  ];

  return (
    <div className="status-legend">
      {statuses.map(status => (
        <div key={status.class} className="legend-item">
          <span className={`legend-color-box status-${status.class}`}></span>
          <span>{status.name}</span>
        </div>
      ))}
    </div>
  );
};

// Renderizar turno
const SimpleEvent = ({ event }) => (
  <div>
    <strong>{event.title}</strong>
    <p style={{ margin: 0, fontSize: '0.9em' }}>{event.data.profesional_nombres}</p>
    <p style={{ margin: '2px 0 0', fontSize: '0.8em', opacity: 0.8 }}>{moment(event.start).format('HH:mm')}</p>
  </div>
);

// Toolbar
const CustomToolbar = ({
  label,
  onNavigate,
  onShowAllConsultorios,
  canShowAllConsultorios,
  isShowingAll,
  onOpenDatePicker,
}) => {
  return (
    <div className="rbc-toolbar">
      <span className="rbc-btn-group">
        <button type="button" onClick={() => onNavigate('PREV')}>&lt; Anterior</button>
        <button type="button" onClick={() => onNavigate('TODAY')}>Hoy</button>
        <button type="button" onClick={() => onNavigate('NEXT')}>Siguiente &gt;</button>
        <button type="button" onClick={onOpenDatePicker}>Ir a fecha…</button>
      </span>
      <StatusLegend />
      <span className="rbc-toolbar-label">{label}</span>
      <span className="rbc-btn-group toolbar-show-consultorios">
        <button
          type="button"
          onClick={onShowAllConsultorios}
          disabled={!canShowAllConsultorios}
          aria-pressed={isShowingAll}
        >
          {isShowingAll ? 'Ver consultorios con turnos' : 'Mostrar todos los consultorios'}
        </button>
      </span>
    </div>
  );
};

// Horario de almuerzo
const TimeSlotWrapper = ({ children, value }) => {
  const isLunchBreak = moment(value).hour() === 13;
  const className = isLunchBreak ? 'lunch-break' : '';
  return React.cloneElement(children, { className: `${children.props.className} ${className}` });
};

// Componente Principal

export default function TurnosGrid({ loggedInProfesionalId, isAdmin = false, currentUserId = null }) {
  const [events, setEvents] = useState([]);
  const [consultoriosTurnos, setConsultoriosTurnos] = useState([]);
  const [todosConsultorios, setTodosConsultorios] = useState([]);
  const [mostrarTodosConsultorios, setMostrarTodosConsultorios] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mostrarSelectorFecha, setMostrarSelectorFecha] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [turnoForPago, setTurnoForPago] = useState(null);
  const [pacienteParaVer, setPacienteParaVer] = useState(null);
  const [mostrarNuevoTurno, setMostrarNuevoTurno] = useState(false);
  const [prefillNuevoTurno, setPrefillNuevoTurno] = useState(null);

  // Datos de turnos
  const fetchTurnos = useCallback(async (date) => {
    try {
      const formattedDate = moment(date).format('YYYY-MM-DD');
      const [turnosRes, formDataRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/turnos?date=${formattedDate}`),
        axios.get(`${API_BASE_URL}/api/turnos/form-data`),
      ]);
      
      const formattedEvents = turnosRes.data.data.map(turno => ({
        id: turno.id,
        title: `${turno.paciente_nombre} ${turno.paciente_apellido}`,
        start: new Date(turno.inicio),
        end: new Date(turno.fin),
        resourceId: turno.consultorio_id,
        data: turno
      }));
      setEvents(formattedEvents);

      const resourcesMap = new Map();
      (turnosRes.data.data || []).forEach((turno) => {
        if (turno.consultorio_id) {
          resourcesMap.set(turno.consultorio_id, {
            resourceId: turno.consultorio_id,
            resourceTitle: turno.consultorio_nombre || `Consultorio ${turno.consultorio_id}`,
          });
        }
      });

      const consultoriosCatalogo = formDataRes.data?.data?.consultorios || [];
      const catalogoResources = consultoriosCatalogo.map((consultorio) => ({
        resourceId: consultorio.id,
        resourceTitle: consultorio.nombre || `Consultorio ${consultorio.id}`,
      }));
      setTodosConsultorios(catalogoResources);

      const resources = Array.from(resourcesMap.values()).sort((a, b) => {
        if (a.resourceId === null) return 1;
        if (b.resourceId === null) return -1;
        return a.resourceId - b.resourceId;
      });

      setConsultoriosTurnos(resources);

    } catch (error) {
      console.error("Error fetching turnos:", error);
    }
  }, []);

  useEffect(() => {
    fetchTurnos(currentDate);
  }, [currentDate, fetchTurnos]);

  const handleEventAction = useCallback(async (turno, data, openPaymentModal = false) => {
    try {
      const headers = {};
      const userHeaderId = currentUserId ?? loggedInProfesionalId;
      if (userHeaderId !== null && userHeaderId !== undefined) {
        headers['X-User-ID'] = userHeaderId;
      }
      if (isAdmin) {
        headers['X-Admin-Override'] = 'true';
      }

      await axios.put(
        `${API_BASE_URL}/api/turnos/${turno.id}`,
        data,
        Object.keys(headers).length ? { headers } : {}
      );
      fetchTurnos(currentDate);
      setSelectedEvent(null);
      
      if (openPaymentModal) {
        setTurnoForPago(turno);
      }
    } catch (error) {
      console.error("Error updating turno:", error);
      alert('Error al actualizar el turno: ' + (error.response?.data?.message || error.message));
    }
  }, [currentDate, fetchTurnos, isAdmin, loggedInProfesionalId, currentUserId]);

  const handleDeleteTurno = useCallback(async (turnoEvent) => {
    if (!turnoEvent?.id) return;

    const confirmed = window.confirm('¿Eliminar este turno de forma permanente?');
    if (!confirmed) return;

    try {
      const headers = {};
      const userHeaderId = currentUserId ?? loggedInProfesionalId;
      if (userHeaderId !== null && userHeaderId !== undefined) {
        headers['X-User-ID'] = userHeaderId;
      }
      if (isAdmin) {
        headers['X-Admin-Override'] = 'true';
      }

      const config = Object.keys(headers).length ? { headers } : {};
      await axios.delete(`${API_BASE_URL}/api/turnos/${turnoEvent.id}`, config);
      fetchTurnos(currentDate);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error deleting turno:', error);
      alert('Error al eliminar el turno: ' + (error.response?.data?.message || error.message));
    }
  }, [currentDate, fetchTurnos, isAdmin, loggedInProfesionalId, currentUserId]);

  const handleEventDrop = useCallback(async ({ event, start, end, resourceId }) => {
    if (intersectsLunchBreak(start, end)) {
      return;
    }
    handleEventAction(event, {
      inicio: moment(start).toISOString(),
      fin: moment(end).toISOString(),
      consultorio_id: resourceId
    });
  }, [handleEventAction]);

  const handleEventResize = useCallback(async ({ event, start, end }) => {
    if (intersectsLunchBreak(start, end)) {
      return;
    }
    handleEventAction(event, {
      inicio: moment(start).toISOString(),
      fin: moment(end).toISOString(),
    });
  }, [handleEventAction]);

  const handleNavigate = (newDate) => {
    setCurrentDate(newDate);
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
  };

  const handleOpenPagos = (turnoEvent) => {
    setSelectedEvent(null);
    setTurnoForPago(turnoEvent.data);
  };

  const handleClosePagoModal = () => {
    setTurnoForPago(null);
  };

  const handleOpenPaciente = (pacienteData) => {
    setSelectedEvent(null); // Cierra el modal de turno
    setPacienteParaVer(pacienteData);
  };

  const handleClosePacienteModal = () => {
    setPacienteParaVer(null);
  };

  const handleOpenNuevoTurno = useCallback((prefill = null) => {
    setPrefillNuevoTurno(prefill);
    setMostrarNuevoTurno(true);
  }, []);

  const handleCloseNuevoTurno = useCallback(() => {
    setMostrarNuevoTurno(false);
    setPrefillNuevoTurno(null);
  }, []);

  const handleTurnoCreado = useCallback(() => {
    fetchTurnos(currentDate);
    setMostrarNuevoTurno(false);
    setPrefillNuevoTurno(null);
  }, [currentDate, fetchTurnos]);

  const handleMostrarTodosConsultorios = () => {
    setMostrarTodosConsultorios((prev) => !prev);
  };

  const calendarResources = mostrarTodosConsultorios ? todosConsultorios : consultoriosTurnos;

  const handleOpenDatePicker = () => {
    setMostrarSelectorFecha(true);
  };

  const handleCloseDatePicker = () => {
    setMostrarSelectorFecha(false);
  };

  const handleDateSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const dateValue = formData.get('goto-date');
    if (dateValue) {
      const selected = moment(dateValue, 'YYYY-MM-DD').toDate();
      if (!Number.isNaN(selected.getTime())) {
        setCurrentDate(selected);
      }
    }
    setMostrarSelectorFecha(false);
  };

  const handleSelectSlot = useCallback((slotInfo) => {
    if (!slotInfo) return;
    const { start, end, resourceId } = slotInfo;
    if (intersectsLunchBreak(start, end)) return;
    const roundedStart = roundToNearestMinutes(start, 30);
    if (!roundedStart) return;

    let roundedEnd = roundToNearestMinutes(end, 30);
    if (!roundedEnd || roundedEnd <= roundedStart) {
      roundedEnd = new Date(roundedStart.getTime() + 30 * 60 * 1000);
    }

    const durationMinutes = Math.max(
      30,
      Math.round((roundedEnd.getTime() - roundedStart.getTime()) / (60 * 1000))
    );

    const prefill = {
      consultorio_id: resourceId ?? null,
      inicio: moment(roundedStart).format('YYYY-MM-DDTHH:mm:ss'),
      date: moment(roundedStart).format('YYYY-MM-DD'),
      startTime: moment(roundedStart).format('HH:mm'),
      duracion_min: durationMinutes,
    };

    handleOpenNuevoTurno(prefill);
  }, [handleOpenNuevoTurno]);

  const slotPropGetter = useCallback((date) => {
    if (intersectsLunchBreak(date)) {
      return {
        className: 'hidden-lunch-slot',
        style: HIDDEN_SLOT_STYLE,
      };
    }
    return {};
  }, []);

  const isEventDraggable = useCallback(
    (event) => {
      if (isAdmin) return true;
      if (!event?.data) return false;
      return parseProfesionalIds(event.data.profesional_ids).includes(String(loggedInProfesionalId));
    },
    [isAdmin, loggedInProfesionalId]
  );

  const eventPropGetter = useCallback((event) => {
    const statusClass = `event-${event.data.estado}`;
    const isMyEvent = parseProfesionalIds(event.data.profesional_ids).includes(String(loggedInProfesionalId));
    const highlightClass = isAdmin || isMyEvent ? 'highlighted-event' : '';
    return { className: `${statusClass} ${highlightClass}` };
  }, [isAdmin, loggedInProfesionalId]);

  const formats = {
    timeGutterFormat: 'HH:mm',
  };

  return (
    <div className="turnos-grid-container">
      <DnDCalendar
        localizer={localizer}
        events={events}
        date={currentDate}
        onNavigate={handleNavigate}
        onSelectEvent={handleSelectEvent}
        defaultView="day"
        views={['day']}
  resources={calendarResources}
        resourceIdAccessor="resourceId"
        resourceTitleAccessor="resourceTitle"
        startAccessor="start"
        endAccessor="end"
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        draggableAccessor={isEventDraggable}
        resizableAccessor={isEventDraggable}
        selectable
  onSelectSlot={handleSelectSlot}
        step={15}
        timeslots={2}
        min={moment(currentDate).set({ h: 9, m: 0 }).toDate()}
        max={moment(currentDate).set({ h: 20, m: 0 }).toDate()}
        formats={formats}
        eventPropGetter={eventPropGetter}
        slotPropGetter={slotPropGetter}
        components={{
          toolbar: (toolbarProps) => (
            <CustomToolbar
              {...toolbarProps}
              onShowAllConsultorios={handleMostrarTodosConsultorios}
              canShowAllConsultorios={todosConsultorios.length > 0}
              isShowingAll={mostrarTodosConsultorios}
              onOpenDatePicker={handleOpenDatePicker}
            />
          ),
          timeSlotWrapper: TimeSlotWrapper,
          event: SimpleEvent
        }}
      />
      {selectedEvent && (
        <TurnoModal 
          event={selectedEvent} 
          onClose={handleCloseModal}
          onUpdate={handleEventAction}
          onDelete={handleDeleteTurno}
          onOpenPagos={handleOpenPagos}
          onOpenPaciente={handleOpenPaciente}
          loggedInProfesionalId={loggedInProfesionalId}
          isAdmin={isAdmin}
        />
      )}
      {turnoForPago && (
        <PagoModal
          turno={turnoForPago}
          onClose={handleClosePagoModal}
        />
      )}
      {pacienteParaVer && (
        <PacienteModal
          paciente={pacienteParaVer}
          onClose={handleClosePacienteModal}
        />
      )}
      <button
        type="button"
        className="floating-create-turno-btn"
        onClick={() => handleOpenNuevoTurno(null)}
      >
        + Nuevo turno
      </button>
      <NuevoTurnoPanel
        isOpen={mostrarNuevoTurno}
        onClose={handleCloseNuevoTurno}
        onCreated={handleTurnoCreado}
        defaultDate={currentDate}
        loggedInProfesionalId={loggedInProfesionalId}
        prefillData={prefillNuevoTurno}
      />
      {mostrarSelectorFecha && (
        <div className="goto-date-overlay" role="dialog" aria-modal="true">
          <form className="goto-date-dialog" onSubmit={handleDateSubmit}>
            <h3>Ir a fecha</h3>
            <label htmlFor="goto-date">Seleccionar fecha</label>
            <input
              id="goto-date"
              name="goto-date"
              type="date"
              defaultValue={moment(currentDate).format('YYYY-MM-DD')}
              required
            />
            <div className="goto-date-actions">
              <button type="button" onClick={handleCloseDatePicker}>Cancelar</button>
              <button type="submit">Ir</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
