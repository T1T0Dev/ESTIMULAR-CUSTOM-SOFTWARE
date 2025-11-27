import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import moment from 'moment';
import axios from 'axios';
import API_BASE_URL from '../constants/api';
import '../styles/NuevoTurnoPanel.css';

const ESTADOS_TURNO = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const formatProfesionalNombre = (prof) =>
  [prof?.nombre, prof?.apellido].filter(Boolean).join(' ').trim();

const pad2 = (value) => String(value).padStart(2, '0');

const capitalizeFirst = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const toDateInputValue = (dateLike) => {
  if (!dateLike) return '';
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const toTimeInputValue = (dateLike) => {
  if (!dateLike) return '';
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(date.getTime())) return '';
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

const clampDiscount = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return 0;
  if (parsed < 0) return 0;
  if (parsed > 1) return 1;
  return parsed;
};

const formatCurrency = (amount, currency = 'ARS') => {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '';
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    if (error) {
      // Ignorar y continuar con fallback
    }
    const value = Number(amount);
    if (Number.isNaN(value)) return '';
    return `${currency} ${value.toFixed(2)}`;
  }
};

export default function NuevoTurnoPanel({
  isOpen,
  onClose,
  onCreated,
  defaultDate,
  loggedInProfesionalId,
  initialNino = null,
  prefillData = null,
}) {
  const [formData, setFormData] = useState(() => ({
    departamento_id: '',
    consultorio_id: '',
    date: moment(defaultDate || new Date()).format('YYYY-MM-DD'),
    startTime: '09:00',
    duracion_min: 30,
    profesional_ids: [],
    notas: '',
    precio: '',
    estado: 'pendiente',
    repetir_semanas: '',
    semana_por_medio: false,
  }));
  const [ninoQuery, setNinoQuery] = useState('');
  const [ninoResultados, setNinoResultados] = useState([]);
  const [selectedNino, setSelectedNino] = useState(null);
  const ninoBloqueado = Boolean(initialNino);
  const [isSearchingNinos, setIsSearchingNinos] = useState(false);
  const [formOptions, setFormOptions] = useState({
    departamentos: [],
    consultorios: [],
    profesionales: [],
  });
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const modalRef = useRef(null);

  const departamentoBloqueado = Boolean(prefillData?.departamento_bloqueado);

  const departamentosResumen = useMemo(() => {
    if (!prefillData) return [];
    const lista = Array.isArray(prefillData.departamentos_resumen)
      ? prefillData.departamentos_resumen
      : [];
    return lista.filter((nombre) => typeof nombre === 'string' && nombre.trim().length > 0);
  }, [prefillData]);

  const serviciosResumen = useMemo(() => {
    if (!prefillData) return null;
    if (prefillData.servicios_resumen) return prefillData.servicios_resumen;
    if (departamentosResumen.length === 0) return null;
    if (departamentosResumen.length === 1) return departamentosResumen[0];
    return departamentosResumen.join(', ');
  }, [departamentosResumen, prefillData]);

  const obraSocialDescuento = useMemo(() => {
    if (!selectedNino) return 0;
    return clampDiscount(selectedNino.paciente_obra_social_descuento);
  }, [selectedNino]);

  const porcentajeDescuento = useMemo(() => {
    if (!obraSocialDescuento) return 0;
    return Math.round(obraSocialDescuento * 100);
  }, [obraSocialDescuento]);

  const precioOriginalNumber = useMemo(() => {
    if (formData.precio === '' || formData.precio === null || formData.precio === undefined) {
      return null;
    }
    const parsed = Number.parseFloat(String(formData.precio).replace(',', '.'));
    if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
      return null;
    }
    return Number(parsed.toFixed(2));
  }, [formData.precio]);

  const precioConDescuento = useMemo(() => {
    if (precioOriginalNumber === null) return null;
    if (!obraSocialDescuento) return precioOriginalNumber;
    const final = Number((precioOriginalNumber * (1 - obraSocialDescuento)).toFixed(2));
    return final < 0 ? 0 : final;
  }, [precioOriginalNumber, obraSocialDescuento]);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoadingForm(true);
    setErrorMessage('');
    setSuccessMessage('');

    axios
      .get(`${API_BASE_URL}/api/turnos/form-data`)
      .then((response) => {
        const { departamentos = [], consultorios = [], profesionales = [] } =
          response.data?.data || {};

        const parsedProfesionales = profesionales.map((prof) => ({
          ...prof,
          nombre_completo: prof.nombre_completo || formatProfesionalNombre(prof),
        }));

        setFormOptions({
          departamentos,
          consultorios,
          profesionales: parsedProfesionales,
        });

        let initialProfesionales = [];
        if (loggedInProfesionalId) {
          const profesionalesIds = parsedProfesionales.map((prof) => Number(prof.id_profesional));
          if (profesionalesIds.includes(Number(loggedInProfesionalId))) {
            initialProfesionales = [Number(loggedInProfesionalId)];
          }
        }

        const shouldOverrideProfesionales =
          !prefillData?.profesional_ids || prefillData?.profesional_ids?.length === 0;
        const shouldOverrideDate = !prefillData?.inicio && !prefillData?.date;

        setFormData((prev) => {
          const next = { ...prev };
          if (shouldOverrideProfesionales) {
            next.profesional_ids = initialProfesionales;
          }
          if (shouldOverrideDate) {
            next.date = moment(defaultDate || new Date()).format('YYYY-MM-DD');
          }
          return next;
        });
      })
      .catch((error) => {
        console.error('Error al cargar datos del formulario del turno:', error);
        setErrorMessage('No se pudo cargar la información necesaria. Intente nuevamente.');
      })
      .finally(() => {
        setIsLoadingForm(false);
      });
  }, [defaultDate, isOpen, loggedInProfesionalId, prefillData]);

  useEffect(() => {
    if (!isOpen) return;

    if (ninoBloqueado) {
      setNinoResultados([]);
      setIsSearchingNinos(false);
      return;
    }

    const trimmed = ninoQuery.trim();
    if (trimmed.length < 2) {
      setNinoResultados([]);
      return;
    }

    setIsSearchingNinos(true);
    const delay = setTimeout(() => {
      axios
        .get(`${API_BASE_URL}/api/ninos`, {
          params: { search: trimmed, limit: 8 },
        })
        .then((response) => {
          const apiData = response.data?.data;
          setNinoResultados(Array.isArray(apiData) ? apiData : []);
        })
        .catch((error) => {
          console.error('Error al buscar niños:', error);
          setErrorMessage('No se pudo buscar el niño.');
        })
        .finally(() => {
          setIsSearchingNinos(false);
        });
    }, 350);

    return () => {
      clearTimeout(delay);
    };
  }, [isOpen, ninoBloqueado, ninoQuery]);

  useEffect(() => {
    if (!isOpen) {
      setFormData((prev) => ({
        ...prev,
        departamento_id: '',
        consultorio_id: '',
        startTime: '09:00',
        duracion_min: 30,
        profesional_ids: [],
        notas: '',
        precio: '',
        estado: 'pendiente',
        repetir_semanas: '',
        semana_por_medio: false,
        date: moment(defaultDate || new Date()).format('YYYY-MM-DD'),
      }));
      setSelectedNino(null);
      setNinoQuery('');
      setNinoResultados([]);
      setErrorMessage('');
      setSuccessMessage('');
      setRepeatEnabled(false);
    }
  }, [isOpen, defaultDate]);

  useEffect(() => {
    if (!isOpen) return;
    if (!initialNino) return;

    setSelectedNino(initialNino);
    const nombreCompleto = [initialNino.paciente_nombre, initialNino.paciente_apellido]
      .filter(Boolean)
      .join(' ')
      .trim();
    setNinoQuery(nombreCompleto);
    setNinoResultados([]);
  }, [initialNino, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!prefillData) return;

    setFormData((prev) => {
      const next = { ...prev };

      if (prefillData.departamento_id !== undefined && prefillData.departamento_id !== null) {
        next.departamento_id = String(prefillData.departamento_id);
      }

      if (prefillData.consultorio_id !== undefined) {
        next.consultorio_id = prefillData.consultorio_id ? String(prefillData.consultorio_id) : '';
      }

      const inicioSource = prefillData.inicio || null;
      const inicioDate = inicioSource ? new Date(inicioSource) : null;

      const dateValue = prefillData.date || toDateInputValue(inicioDate) || next.date;
      const timeValue = prefillData.startTime || toTimeInputValue(inicioDate) || next.startTime;

      if (dateValue) next.date = dateValue;
      if (timeValue) next.startTime = timeValue;

      if (prefillData.duracion_min !== undefined && prefillData.duracion_min !== null) {
        next.duracion_min = prefillData.duracion_min;
      }

      if (Array.isArray(prefillData.profesional_ids)) {
        next.profesional_ids = prefillData.profesional_ids
          .map((id) => Number(id))
          .filter((id) => !Number.isNaN(id));
      }

      if (prefillData.estado) {
        next.estado = prefillData.estado;
      }

      if (prefillData.notas !== undefined) {
        next.notas = prefillData.notas || '';
      }

      return next;
    });

    const repeatCount = Number(prefillData.repetir_semanas);
    setRepeatEnabled(Number.isFinite(repeatCount) && repeatCount > 0);

    setErrorMessage('');
    setSuccessMessage('');
  }, [isOpen, prefillData]);

  useEffect(() => {
    if (!formData.departamento_id) return;
    const departamento = formOptions.departamentos.find(
      (dep) => String(dep.id_departamento) === String(formData.departamento_id)
    );
    if (departamento?.duracion_default_min) {
      setFormData((prev) => ({
        ...prev,
        duracion_min: departamento.duracion_default_min,
      }));
    }
  }, [formData.departamento_id, formOptions.departamentos]);

  const profesionalesFiltrados = useMemo(() => {
    const listaProfesionales = Array.isArray(formOptions.profesionales)
      ? formOptions.profesionales
      : [];

    const idsSeleccionados = new Set(
      (formData.profesional_ids || [])
        .map((id) => Number(id))
        .filter((id) => !Number.isNaN(id))
    );

    const seleccionados = listaProfesionales.filter((prof) =>
      idsSeleccionados.has(Number(prof.id_profesional))
    );

    if (!formData.departamento_id) {
      const mapa = new Map();
      seleccionados.forEach((prof) => {
        const idNum = Number(prof.id_profesional);
        if (!Number.isNaN(idNum)) {
          mapa.set(idNum, prof);
        }
      });
      listaProfesionales.forEach((prof) => {
        const idNum = Number(prof.id_profesional);
        if (!Number.isNaN(idNum) && !mapa.has(idNum)) {
          mapa.set(idNum, prof);
        }
      });
      return Array.from(mapa.values());
    }

    const filtrados = listaProfesionales.filter(
      (prof) => String(prof.id_departamento) === String(formData.departamento_id)
    );

    const seleccionadosFuera = seleccionados.filter(
      (prof) => String(prof.id_departamento) !== String(formData.departamento_id)
    );

    const mapa = new Map();
    seleccionadosFuera.forEach((prof) => {
      const idNum = Number(prof.id_profesional);
      if (!Number.isNaN(idNum)) {
        mapa.set(idNum, prof);
      }
    });
    filtrados.forEach((prof) => {
      const idNum = Number(prof.id_profesional);
      if (!Number.isNaN(idNum)) {
        mapa.set(idNum, prof);
      }
    });

    return Array.from(mapa.values());
  }, [formData.departamento_id, formData.profesional_ids, formOptions.profesionales]);

  const dropdownDisabled = profesionalesFiltrados.length === 0;

  const repeatSummaryText = useMemo(() => {
    if (!repeatEnabled) return '';

    const weeksNumber = Number(formData.repetir_semanas);
    if (!Number.isFinite(weeksNumber) || weeksNumber <= 0) return '';
    if (!formData.date || !formData.startTime) return '';

    const baseDate = moment(formData.date, 'YYYY-MM-DD');
    if (!baseDate.isValid()) return '';

    const weekday = capitalizeFirst(baseDate.locale('es').format('dddd'));
    let summary = `El turno se repetira por los proximos ${weeksNumber} ${weekday} a las ${formData.startTime}`;
    if (formData.semana_por_medio) {
      summary += ' dejando una semana de por medio.';
    } else {
      summary += '.';
    }

    return summary;
  }, [
    repeatEnabled,
    formData.repetir_semanas,
    formData.date,
    formData.startTime,
    formData.semana_por_medio,
  ]);

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleNumeroChange = (event) => {
    const { name, value } = event.target;
    const sanitized = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    setFormData((prev) => ({
      ...prev,
      [name]: sanitized,
    }));
  };


  const handleSelectNino = (nino) => {
    setSelectedNino(nino);
    const nombreCompleto = [nino.paciente_nombre, nino.paciente_apellido]
      .filter(Boolean)
      .join(' ')
      .trim();
    setNinoQuery(nombreCompleto);
    setNinoResultados([]);
  };

  const handleClearNino = () => {
    if (ninoBloqueado) return;
    setSelectedNino(null);
    setNinoQuery('');
  };

  const resetMessages = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleProfesionalChange = (event) => {
    const { value } = event.target;
    const idNumber = Number(value);

    setFormData((prev) => ({
      ...prev,
      profesional_ids: value && !Number.isNaN(idNumber) ? [idNumber] : [],
    }));

    resetMessages();
  };

  const handleRepeatToggle = () => {
    setRepeatEnabled((prevEnabled) => {
      const nextEnabled = !prevEnabled;

      setFormData((prev) => {
        if (nextEnabled) {
          const currentCountNumber = Number(prev.repetir_semanas);
          const nextCount =
            Number.isFinite(currentCountNumber) && currentCountNumber > 0
              ? String(currentCountNumber)
              : '1';
          return {
            ...prev,
            repetir_semanas: nextCount,
          };
        }

        return {
          ...prev,
          repetir_semanas: '',
          semana_por_medio: false,
        };
      });

      return nextEnabled;
    });

    resetMessages();
  };

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    if (onClose) onClose();
  }, [isSubmitting, onClose]);

  const handleOverlayClick = useCallback(
    (event) => {
      if (event.target !== event.currentTarget) return;
      handleClose();
    },
    [handleClose]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    resetMessages();

    if (!selectedNino?.paciente_id && !selectedNino?.id_nino) {
      setErrorMessage('Seleccione un niño para el turno.');
      return;
    }

    if (!formData.departamento_id) {
      setErrorMessage('Seleccione un servicio / departamento.');
      return;
    }

    if (!formData.date || !formData.startTime) {
      setErrorMessage('Seleccione fecha y hora de inicio.');
      return;
    }

    setIsSubmitting(true);

    try {
      const baseStartMoment = moment(
        `${formData.date} ${formData.startTime}`,
        'YYYY-MM-DD HH:mm'
      );

      if (!baseStartMoment.isValid()) {
        setErrorMessage('La fecha y hora seleccionadas no son válidas.');
        setIsSubmitting(false);
        return;
      }
      const duracionMin = Math.max(parseInt(formData.duracion_min, 10) || 30, 5);
      const repeatWeeks = Math.max(parseInt(formData.repetir_semanas, 10) || 0, 0);
      const intervalDays = formData.semana_por_medio ? 14 : 7;

      const profesionalIdsSeleccionados = formData.profesional_ids
        .map((id) => Number(id))
        .filter((id) => !Number.isNaN(id));

      const basePayload = {
        departamento_id: Number(formData.departamento_id),
        consultorio_id: formData.consultorio_id ? Number(formData.consultorio_id) : null,
        duracion_min: duracionMin,
        nino_id: selectedNino.paciente_id || selectedNino.id_nino,
        notas: formData.notas?.trim() || null,
        profesional_ids: profesionalIdsSeleccionados,
        precio: precioOriginalNumber === null ? null : precioConDescuento,
        estado: formData.estado,
      };

      const payloads = Array.from({ length: repeatWeeks + 1 }, (_, index) => ({
        ...basePayload,
        inicio: baseStartMoment.clone().add(index * intervalDays, 'days').toISOString(),
      }));

      const createdTurnos = [];
      let creationError = null;

      for (let index = 0; index < payloads.length; index += 1) {
        try {
          const response = await axios.post(`${API_BASE_URL}/api/turnos`, payloads[index], {
            headers: loggedInProfesionalId
              ? { 'X-User-ID': loggedInProfesionalId }
              : undefined,
          });
          createdTurnos.push(response.data?.data);
        } catch (error) {
          creationError = error;
          break;
        }
      }

      if (createdTurnos.length > 0) {
        const mensaje =
          createdTurnos.length === 1
            ? 'Turno creado correctamente.'
            : `Se programaron ${createdTurnos.length} turnos en total.`;
        setSuccessMessage(mensaje);
        if (!ninoBloqueado) {
          setSelectedNino(null);
          setNinoQuery('');
        }
        setFormData((prev) => ({
          ...prev,
          consultorio_id: '',
          notas: '',
          profesional_ids: profesionalIdsSeleccionados,
          precio: '',
          repetir_semanas: '',
          semana_por_medio: false,
        }));

        if (onCreated) {
          onCreated(createdTurnos[0]);
        }
      }

      if (creationError) {
        console.error('Error al crear turnos repetidos:', creationError);
        const mensajeError =
          creationError.response?.data?.message ||
          'No se pudieron crear todos los turnos de la serie.';
        setErrorMessage(mensajeError);
      }

      if (createdTurnos.length === 0 && !creationError) {
        setErrorMessage('No se pudo crear el turno. Intente nuevamente.');
      }
    } catch (error) {
      console.error('Error al preparar la creación de turnos:', error);
      const message =
        error.response?.data?.message || 'No se pudo crear el turno. Intente nuevamente.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="nuevo-turno-overlay"
      role="dialog"
      aria-modal="true"
      onClick={handleOverlayClick}
    >
      <div
        className="nuevo-turno-modal"
        ref={modalRef}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="nuevo-turno-head">
          <h2 className="nuevo-turno-title">Crear nuevo turno</h2>
          <button
            type="button"
            className="nuevo-turno-close"
            onClick={handleClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="nuevo-turno-body">
          {isLoadingForm ? (
            <div className="nuevo-turno-loading">Cargando información…</div>
          ) : (
            <form className="nuevo-turno-form" onSubmit={handleSubmit}>
              {errorMessage && <div className="nuevo-turno-alert error">{errorMessage}</div>}
              {successMessage && <div className="nuevo-turno-alert success">{successMessage}</div>}

              {Array.isArray(prefillData?.profesionales_resumen) &&
                prefillData.profesionales_resumen.length > 0 && (
                  <div className="nuevo-turno-alert info">
                    {serviciosResumen && (
                      <p className="multi-turno-services">
                        Servicios incluidos: <strong>{serviciosResumen}</strong>
                      </p>
                    )}
                    <div className="multi-turno-title">Profesionales confirmados</div>
                    <ul className="multi-turno-list">
                      {prefillData.profesionales_resumen.map((prof) => (
                        <li key={prof.id_profesional}>
                          <strong>{prof.nombre_completo}</strong>
                          {Array.isArray(prof.departamentos) && prof.departamentos.length > 0 && (
                            <span className="multi-turno-departamentos"> · {prof.departamentos.join(', ')}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {Array.isArray(prefillData.departamentos_resumen) &&
                      prefillData.departamentos_resumen.length > 1 && (
                        <p className="multi-turno-hint">
                          Este turno reúne {prefillData.departamentos_resumen.length} servicios simultáneamente.
                        </p>
                      )}
                  </div>
                )}

              <div className="form-section">
                <label htmlFor="nino">Niño/a</label>
                <div className="autocomplete-wrapper">
                  <input
                    id="nino"
                    type="text"
                    value={ninoQuery}
                    onChange={(event) => {
                      setNinoQuery(event.target.value);
                      resetMessages();
                    }}
                    placeholder="Buscar por nombre, apellido o DNI"
                    autoComplete="off"
                    disabled={ninoBloqueado}
                    readOnly={ninoBloqueado}
                  />
                  {selectedNino && !ninoBloqueado && (
                    <button
                      type="button"
                      className="clear-button"
                      onClick={handleClearNino}
                      aria-label="Quitar niño seleccionado"
                    >
                      ×
                    </button>
                  )}
                  {!isSearchingNinos && ninoResultados.length > 0 && (
                    <ul className="autocomplete-list">
                      {ninoResultados.map((nino) => {
                        const descuentoValor = clampDiscount(
                          nino.paciente_obra_social_descuento ?? nino.obra_social?.descuento
                        );
                        const obraSocialNombre =
                          nino.paciente_obra_social ||
                          nino.obra_social?.nombre_obra_social ||
                          'Sin obra social';
                        const descuentoLabel =
                          descuentoValor > 0 ? `${Math.round(descuentoValor * 100)}% OFF` : null;

                        return (
                          <li key={nino.paciente_id || nino.id_nino}>
                            <button type="button" onClick={() => handleSelectNino(nino)}>
                              <span className="nombre">
                                {[
                                  nino.paciente_nombre,
                                  nino.paciente_apellido,
                                ]
                                  .filter(Boolean)
                                  .join(' ')
                                  .trim() || 'Sin nombre'}
                              </span>
                              <span className="detalle">
                                DNI: {nino.paciente_dni || '—'} · Obra social: {obraSocialNombre}
                                {descuentoLabel && (
                                  <span className="detalle-descuento"> · {descuentoLabel}</span>
                                )}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                {isSearchingNinos && <p className="autocomplete-hint">Buscando…</p>}
                {selectedNino && (
                  <div className="selected-nino-details">
                    <p>
                      <strong>Obra social:</strong>{' '}
                      {selectedNino.paciente_obra_social || 'Sin obra social'}
                      {obraSocialDescuento > 0 && (
                        <span className="selected-nino-discount">
                          {' '}
                          ({porcentajeDescuento}% de descuento)
                        </span>
                      )}
                    </p>
                    <p>
                      <strong>Responsables:</strong>{' '}
                      {selectedNino.paciente_responsables
                        ?.map((resp) => {
                          const nombre = [resp.nombre, resp.apellido]
                            .filter(Boolean)
                            .join(' ')
                            .trim();
                          if (nombre && resp.parentesco) {
                            return `${nombre} (${resp.parentesco})`;
                          }
                          return nombre || resp.parentesco || null;
                        })
                        .filter(Boolean)
                        .join(', ') || 'Sin responsables registrados'}
                    </p>
                    {selectedNino.paciente_cud && selectedNino.paciente_cud !== 'No posee' && (
                      <p className="badge">Posee CUD</p>
                    )}
                  </div>
                )}
              </div>

              <div className="form-grid">
                {!departamentoBloqueado && (
                  <div className="form-section">
                    <label htmlFor="departamento_id">Servicio</label>
                    <select
                      id="departamento_id"
                      name="departamento_id"
                      value={formData.departamento_id}
                      onChange={(event) => {
                        handleInputChange(event);
                        resetMessages();
                      }}
                      required
                    >
                      <option value="">Seleccionar servicio</option>
                      {formOptions.departamentos.map((dep) => (
                        <option key={dep.id_departamento} value={dep.id_departamento}>
                          {dep.nombre}
                        </option>
                      ))}
                    </select>
                    {formData.departamento_id && (
                      <p className="field-hint">
                        Duración sugerida: {
                          formOptions.departamentos.find(
                            (dep) => String(dep.id_departamento) === String(formData.departamento_id)
                          )?.duracion_default_min || '—'
                        }{' '}
                        minutos
                      </p>
                    )}
                  </div>
                )}

                <div className="form-section">
                  <label htmlFor="consultorio_id">Consultorio</label>
                  <select
                    id="consultorio_id"
                    name="consultorio_id"
                    value={formData.consultorio_id}
                    onChange={(event) => {
                      handleInputChange(event);
                      resetMessages();
                    }}
                    disabled={departamentoBloqueado}
                  >
                    <option value="">Sin asignar</option>
                    {formOptions.consultorios.map((consultorio) => (
                      <option key={consultorio.id} value={consultorio.id}>
                        {consultorio.nombre}
                      </option>
                    ))}
                  </select>
                  {departamentoBloqueado && formData.consultorio_id && (
                    <p className="field-hint">
                      Este consultorio se mantendrá para el turno combinado.
                    </p>
                  )}
                </div>

                <div className="form-section">
                  <label htmlFor="date">Fecha</label>
                  <input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={(event) => {
                      handleInputChange(event);
                      resetMessages();
                    }}
                    required
                  />
                </div>

                <div className="form-section">
                  <label htmlFor="startTime">Hora de inicio</label>
                  <input
                    id="startTime"
                    name="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(event) => {
                      handleInputChange(event);
                      resetMessages();
                    }}
                    required
                  />
                </div>

                <div className="form-section">
                  <label htmlFor="duracion_min">Duración (minutos)</label>
                  <input
                    id="duracion_min"
                    name="duracion_min"
                    type="number"
                    min="5"
                    step="5"
                    value={formData.duracion_min}
                    onChange={(event) => {
                      handleInputChange(event);
                      resetMessages();
                    }}
                    required
                  />
                </div>

                {!departamentoBloqueado && (
                  <div className="form-section">
                    <label htmlFor="profesional_id">Seleccionar Profesional</label>
                    <select
                      id="profesional_id"
                      name="profesional_id"
                      value={
                        formData.profesional_ids.length > 0
                          ? String(formData.profesional_ids[0])
                          : ''
                      }
                      onChange={handleProfesionalChange}
                      disabled={dropdownDisabled}
                    >
                      <option value="">Sin asignar</option>
                      {profesionalesFiltrados.map((profesional) => (
                        <option
                          key={profesional.id_profesional}
                          value={profesional.id_profesional}
                        >
                          {profesional.nombre_completo}
                        </option>
                      ))}
                    </select>
                    {dropdownDisabled && (
                      <p className="field-hint">No hay profesionales para este servicio.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="form-grid">
                <div className="form-section">
                  <label htmlFor="estado">Estado</label>
                  <select
                    id="estado"
                    name="estado"
                    value={formData.estado}
                    onChange={(event) => {
                      handleInputChange(event);
                      resetMessages();
                    }}
                  >
                    {ESTADOS_TURNO.map((estado) => (
                      <option key={estado.value} value={estado.value}>
                        {estado.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-section">
                  <label htmlFor="precio">Precio</label>
                  <input
                    id="precio"
                    name="precio"
                    type="text"
                    inputMode="decimal"
                    value={formData.precio}
                    onChange={(event) => {
                      handleNumeroChange(event);
                      resetMessages();
                    }}
                    placeholder="Ej: 4500"
                  />
                  {selectedNino && obraSocialDescuento > 0 && precioOriginalNumber !== null && (
                    <div className="price-discount-preview">
                      <span className="price-original">
                        {formatCurrency(precioOriginalNumber)}
                      </span>
                      <span className="price-arrow" aria-hidden="true">→</span>
                      <span className="price-discounted">
                        {formatCurrency(precioConDescuento)}
                      </span>
                      <span className="price-discount-note">
                        {porcentajeDescuento}% cubierto por obra social
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {!departamentoBloqueado && (
                <div className="form-section">
                  <div className="repeat-weekly-section">
                    <div className="repeat-weekly-header">
                      <div className="repeat-toggle">
                        <input
                          id="repeat_enabled"
                          type="checkbox"
                          checked={repeatEnabled}
                          onChange={handleRepeatToggle}
                        />
                        <label htmlFor="repeat_enabled">Repetir semanalmente</label>
                      </div>
                      {repeatEnabled && (
                        <div className="repeat-count">
                          <input
                            id="repetir_semanas"
                            name="repetir_semanas"
                            type="number"
                            min="1"
                            max="52"
                            step="1"
                            value={formData.repetir_semanas}
                            onChange={(event) => {
                              handleInputChange(event);
                              resetMessages();
                            }}
                            placeholder="1"
                          />
                          <span>semanas</span>
                        </div>
                      )}
                    </div>
                    {repeatEnabled && (
                      <>
                        <div className="repeat-checkbox">
                          <input
                            id="semana_por_medio"
                            name="semana_por_medio"
                            type="checkbox"
                            checked={Boolean(formData.semana_por_medio)}
                            onChange={(event) => {
                              handleInputChange(event);
                              resetMessages();
                            }}
                          />
                          <label htmlFor="semana_por_medio">Crear semana por medio</label>
                        </div>
                        <span className="repeat-hint">
                          Cantidad de semanas adicionales después de la fecha seleccionada. Si marcás «Semana por
                          medio» se crearán cada dos semanas.
                        </span>
                        {repeatSummaryText && (
                          <p className="repeat-summary">{repeatSummaryText}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="form-section">
                <label htmlFor="notas">Notas</label>
                <textarea
                  id="notas"
                  name="notas"
                  rows={3}
                  value={formData.notas}
                  onChange={(event) => {
                    handleInputChange(event);
                    resetMessages();
                  }}
                  placeholder="Observaciones adicionales para el turno"
                />
              </div>

              <div className="nuevo-turno-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Creando…' : 'Crear turno'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
