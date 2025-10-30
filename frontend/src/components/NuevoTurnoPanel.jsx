import React, { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import axios from 'axios';
import API_BASE_URL from '../constants/api';
import '../styles/NuevoTurnoPanel.css';

const ESTADOS_TURNO = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
];

const MONEDAS = [
  { value: 'ARS', label: 'ARS' },
  { value: 'USD', label: 'USD' },
];

const formatProfesionalNombre = (prof) =>
  [prof?.nombre, prof?.apellido].filter(Boolean).join(' ').trim();

export default function NuevoTurnoPanel({
  isOpen,
  onClose,
  onCreated,
  defaultDate,
  loggedInProfesionalId,
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
    moneda: 'ARS',
    metodo_pago: 'efectivo',
    estado: 'pendiente',
  }));
  const [ninoQuery, setNinoQuery] = useState('');
  const [ninoResultados, setNinoResultados] = useState([]);
  const [selectedNino, setSelectedNino] = useState(null);
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

        setFormData((prev) => ({
          ...prev,
          profesional_ids: initialProfesionales,
          date: moment(defaultDate || new Date()).format('YYYY-MM-DD'),
        }));
      })
      .catch((error) => {
        console.error('Error al cargar datos del formulario del turno:', error);
        setErrorMessage('No se pudo cargar la información necesaria. Intente nuevamente.');
      })
      .finally(() => {
        setIsLoadingForm(false);
      });
  }, [isOpen, defaultDate, loggedInProfesionalId]);

  useEffect(() => {
    if (!isOpen) return;

    if (ninoQuery.trim().length < 2) {
      setNinoResultados([]);
      return;
    }

    setIsSearchingNinos(true);
    const delay = setTimeout(() => {
      axios
        .get(`${API_BASE_URL}/api/ninos`, {
          params: { search: ninoQuery.trim(), limit: 8 },
        })
        .then((response) => {
          setNinoResultados(response.data?.data || []);
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
  }, [ninoQuery, isOpen]);

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
        moneda: 'ARS',
        metodo_pago: 'efectivo',
        estado: 'pendiente',
        date: moment(defaultDate || new Date()).format('YYYY-MM-DD'),
      }));
      setSelectedNino(null);
      setNinoQuery('');
      setNinoResultados([]);
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen, defaultDate]);

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
    if (!formData.departamento_id) return formOptions.profesionales;
    return formOptions.profesionales.filter(
      (prof) => String(prof.id_departamento) === String(formData.departamento_id)
    );
  }, [formData.departamento_id, formOptions.profesionales]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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

  const toggleProfesional = (idProfesional) => {
    setFormData((prev) => {
      const exists = prev.profesional_ids.includes(idProfesional);
      if (exists) {
        return {
          ...prev,
          profesional_ids: prev.profesional_ids.filter((id) => id !== idProfesional),
        };
      }
      return {
        ...prev,
        profesional_ids: [...prev.profesional_ids, idProfesional],
      };
    });
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
    setSelectedNino(null);
    setNinoQuery('');
  };

  const resetMessages = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

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
      const inicio = moment(
        `${formData.date} ${formData.startTime}`,
        'YYYY-MM-DD HH:mm'
      ).toISOString();

      const duracionMin = Math.max(parseInt(formData.duracion_min, 10) || 30, 5);

      const payload = {
        departamento_id: Number(formData.departamento_id),
        consultorio_id: formData.consultorio_id ? Number(formData.consultorio_id) : null,
        inicio,
        duracion_min: duracionMin,
  nino_id: selectedNino.paciente_id || selectedNino.id_nino,
        notas: formData.notas?.trim() || null,
        profesional_ids: formData.profesional_ids.map((id) => Number(id)).filter((id) => !Number.isNaN(id)),
        precio:
          formData.precio === ''
            ? null
            : Number(parseFloat(formData.precio.replace(',', '.')).toFixed(2)),
        moneda: formData.moneda || 'ARS',
        metodo_pago: formData.metodo_pago || 'efectivo',
        estado: formData.estado,
      };

      const response = await axios.post(`${API_BASE_URL}/api/turnos`, payload, {
        headers: loggedInProfesionalId
          ? { 'X-User-ID': loggedInProfesionalId }
          : undefined,
      });

      setSuccessMessage('Turno creado correctamente.');
      setSelectedNino(null);
      setNinoQuery('');
      setFormData((prev) => ({
        ...prev,
        consultorio_id: '',
        notas: '',
        profesional_ids: payload.profesional_ids,
        precio: '',
      }));

      if (onCreated) {
        onCreated(response.data?.data);
      }
    } catch (error) {
      console.error('Error al crear el turno:', error);
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
    <div className="nuevo-turno-overlay" role="dialog" aria-modal="true">
      <div className="nuevo-turno-panel">
        <div className="nuevo-turno-header">
          <h2>Crear nuevo turno</h2>
          <button type="button" className="close-button" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        {isLoadingForm ? (
          <div className="nuevo-turno-loading">Cargando información…</div>
        ) : (
          <form className="nuevo-turno-form" onSubmit={handleSubmit}>
            {errorMessage && <div className="nuevo-turno-alert error">{errorMessage}</div>}
            {successMessage && <div className="nuevo-turno-alert success">{successMessage}</div>}

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
                />
                {selectedNino && (
                  <button
                    type="button"
                    className="clear-button"
                    onClick={handleClearNino}
                    aria-label="Quitar niño seleccionado"
                  >
                    ×
                  </button>
                )}
              </div>
              {isSearchingNinos && <p className="autocomplete-hint">Buscando…</p>}
              {!isSearchingNinos && ninoResultados.length > 0 && (
                <ul className="autocomplete-list">
                  {ninoResultados.map((nino) => (
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
                          DNI: {nino.paciente_dni || '—'} · Obra social: {nino.paciente_obra_social || 'Sin obra social'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selectedNino && (
                <div className="selected-nino-details">
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
                >
                  <option value="">Sin asignar</option>
                  {formOptions.consultorios.map((consultorio) => (
                    <option key={consultorio.id} value={consultorio.id}>
                      {consultorio.nombre}
                    </option>
                  ))}
                </select>
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

              <div className="form-section">
                <label>Profesionales</label>
                <div className="profesionales-list">
                  {profesionalesFiltrados.length === 0 ? (
                    <p className="field-hint">No hay profesionales para este servicio.</p>
                  ) : (
                    profesionalesFiltrados.map((prof) => (
                      <label key={prof.id_profesional} className="checkbox-item">
                        <input
                          type="checkbox"
                          value={prof.id_profesional}
                          checked={formData.profesional_ids.includes(Number(prof.id_profesional))}
                          onChange={() => {
                            toggleProfesional(Number(prof.id_profesional));
                            resetMessages();
                          }}
                        />
                        <span>{prof.nombre_completo}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
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
              </div>

              <div className="form-section">
                <label htmlFor="moneda">Moneda</label>
                <select
                  id="moneda"
                  name="moneda"
                  value={formData.moneda}
                  onChange={(event) => {
                    handleInputChange(event);
                    resetMessages();
                  }}
                  disabled={!formData.precio}
                >
                  {MONEDAS.map((moneda) => (
                    <option key={moneda.value} value={moneda.value}>
                      {moneda.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-section">
                <label htmlFor="metodo_pago">Método de pago</label>
                <select
                  id="metodo_pago"
                  name="metodo_pago"
                  value={formData.metodo_pago}
                  onChange={(event) => {
                    handleInputChange(event);
                    resetMessages();
                  }}
                  disabled={!formData.precio}
                >
                  {METODOS_PAGO.map((metodo) => (
                    <option key={metodo.value} value={metodo.value}>
                      {metodo.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
              <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
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
  );
}
