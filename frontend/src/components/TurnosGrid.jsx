import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import axios from 'axios';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import '../styles/Turnos.css';


const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);



// Renderizar turno
const CustomEvent = ({ event, loggedInProfesionalId }) => {
  const isMyEvent = event.data.profesional_ids?.split(',').includes(String(loggedInProfesionalId));
  const eventStyle = isMyEvent ? 'highlighted-event' : '';

  return (
    <div className={eventStyle}>
      <strong>{event.title}</strong>
      <p style={{ margin: 0, fontSize: '0.9em' }}>{event.data.profesional_nombres}</p>
    </div>
  );
};

// Toolbar
const CustomToolbar = ({ label, onNavigate }) => {
  return (
    <div className="rbc-toolbar">
      <span className="rbc-btn-group">
        <button type="button" onClick={() => onNavigate('PREV')}>&lt; Anterior</button>
        <button type="button" onClick={() => onNavigate('TODAY')}>Hoy</button>
        <button type="button" onClick={() => onNavigate('NEXT')}>Siguiente &gt;</button>
      </span>
      <span className="rbc-toolbar-label">{label}</span>
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

export default function TurnosGrid() {
  const [events, setEvents] = useState([]);
  const [consultorios, setConsultorios] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const loggedInProfesionalId = 1; // Hardcoded for demonstration

  // Datos de turnos
  const fetchTurnos = useCallback(async (date) => {
    try {
      const formattedDate = moment(date).format('YYYY-MM-DD');
      const res = await axios.get(`http://localhost:3001/api/turnos?date=${formattedDate}`);
      
      const formattedEvents = res.data.data.map(turno => ({
        id: turno.id,
        title: `${turno.paciente_nombre} ${turno.paciente_apellido}`,
        start: new Date(turno.inicio),
        end: new Date(turno.fin),
        resourceId: turno.consultorio_id,
        data: turno
      }));
      setEvents(formattedEvents);

      if (consultorios.length === 0) {
        const resources = res.data.data.reduce((acc, turno) => {
          if (!acc.some(c => c.resourceId === turno.consultorio_id)) {
            acc.push({ resourceId: turno.consultorio_id, resourceTitle: turno.consultorio_nombre });
          }
          return acc;
        }, []);
        resources.sort((a, b) => a.resourceId - b.resourceId);
        setConsultorios(resources);
      }

    } catch (error) {
      console.error("Error fetching turnos:", error);
    }
  }, [consultorios]);

  useEffect(() => {
    fetchTurnos(currentDate);
  }, [currentDate, fetchTurnos]);

  // Callbacks para drag and drop
  const handleEventDrop = useCallback(async ({ event, start, end, resourceId }) => {
    try {
      await axios.put(`http://localhost:3001/api/turnos/${event.id}`, {
        inicio: moment(start).format('YYYY-MM-DD HH:mm:ss'),
        fin: moment(end).format('YYYY-MM-DD HH:mm:ss'),
        consultorio_id: resourceId
      });
      fetchTurnos(currentDate);
    } catch (error) {
      console.error("Error updating turno:", error);
    }
  }, [currentDate, fetchTurnos]);

  const handleEventResize = useCallback(async ({ event, start, end }) => {
    try {
      await axios.put(`http://localhost:3001/api/turnos/${event.id}`, {
        inicio: moment(start).format('YYYY-MM-DD HH:mm:ss'),
        fin: moment(end).format('YYYY-MM-DD HH:mm:ss'),
      });
      fetchTurnos(currentDate);
    } catch (error) {
      console.error("Error updating turno:", error);
    }
  }, [currentDate, fetchTurnos]);

  const handleNavigate = (newDate) => {
    setCurrentDate(newDate);
  };

  return (
    <div className="turnos-grid-container">
      <DnDCalendar
        localizer={localizer}
        events={events}
        date={currentDate}
        onNavigate={handleNavigate}
        defaultView="day"
        views={['day']}
        resources={consultorios}
        resourceIdAccessor="resourceId"
        resourceTitleAccessor="resourceTitle"
        startAccessor="start"
        endAccessor="end"
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        resizable
        selectable
        step={15}
        timeslots={2}
        min={moment(currentDate).set({ h: 9, m: 0 }).toDate()}
        max={moment(currentDate).set({ h: 20, m: 0 }).toDate()}
        components={{
          toolbar: CustomToolbar,
          timeSlotWrapper: TimeSlotWrapper,
          event: (props) => <CustomEvent {...props} loggedInProfesionalId={loggedInProfesionalId} />
        }}
      />
    </div>
  );
}
