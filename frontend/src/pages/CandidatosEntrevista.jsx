// CandidatosEntrevista.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/CandidatosEntrevista.css';
import { MdEdit, MdDelete } from 'react-icons/md';
import { FaCheck, FaTimes, FaInfoCircle } from 'react-icons/fa';
import API_BASE_URL from "../constants/api";


const ESTADOS = [
  { key: 'entrevistar', label: 'Entrevistar' },
  { key: 'entrevistado', label: 'Entrevistado' },
  { key: 'descartado', label: 'Descartado' },
];

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return '';
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
}

export default function CandidatosEntrevista() {
  const [candidatos, setCandidatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actualizando, setActualizando] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const pageSize = 10;
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  const fetchCandidatos = async (search = '', pageNum = 1) => {
    setLoading(true);
    try {
      const res = await axios.get(API_BASE_URL+'/api/candidatos', {
        params: { search, page: pageNum, pageSize },
      });
      setCandidatos(res.data.data || []);
      setTotal(res.data.total || 0);
      setError(null);
    } catch {
      setError('Error al obtener los candidatos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidatos(busqueda, page);
    // eslint-disable-next-line
  }, [page]);

  const cambiarEstado = async (id_candidato, estado) => {
    setActualizando(id_candidato + '-' + estado);
    try {
      await axios.put(API_BASE_URL+`/api/candidatos/${id_candidato}/estado`, { estado_entrevista: estado });
      await fetchCandidatos(busqueda, page);
    } catch {
      setError('No se pudo cambiar el estado');
    } finally {
      setActualizando(null);
    }
  };

  const handleBuscar = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCandidatos(busqueda, 1);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <section className="candidatos-page">
      <div className="candidatos-top">
        <h1 className="candidatos-title">Candidatos a entrevista</h1>

        <div className="candidatos-controls">
          <form className="busqueda-form" onSubmit={handleBuscar} role="search" aria-label="Buscar candidatos">
            <label className="sr-only" htmlFor="buscar">Buscar</label>
            <div className="search">
              <svg className="icon search-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5z"/></svg>
              <input
                id="buscar"
                type="text"
                className="busqueda-input"
                placeholder="Buscar por nombre, apellido o DNI"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </form>

          <div className="action-buttons">
            <button className="btn primary">+ Agregar candidato</button>
            <button className="btn outline-pink">Filtrar</button>
            <button className="btn ghost">Exportar</button>
          </div>
        </div>
      </div>

      <div className="card candidatos-card">
        {loading ? (
          <div className="loader">Cargando candidatos...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : candidatos.length === 0 ? (
          <div className="empty">No se encontraron candidatos.</div>
        ) : (
          <>
            <div className="table-tools">
              <div className="left">
                <div className="meta">{total} candidatos</div>
              </div>
              <div className="right">
                <div className="meta">Página {page} de {totalPages}</div>
              </div>
            </div>

            <table className="table candidatos-table" role="table" aria-label="Lista de candidatos">
              <thead>
                <tr>
                  <th className="col-name">Nombre</th>
                  <th className="col-last">Apellido</th>
                  <th className="col-dni">DNI</th>
                  <th className="col-cert">Certificado</th>
                  <th className="col-os">Obra Social</th>
                  <th className="col-resp">Responsable</th>
                  <th className="col-state">Estado</th>
                  <th className="col-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {candidatos.map((c) => {
                  const estadoKey = c.estado_entrevista || 'entrevistar';
                  const isEditing = editId === c.id_candidato;
                  return (
                    <tr key={c.id_candidato}>
                      <td className="col-name">
                        {isEditing ? (
                          <input
                            className="edit-input"
                            type="text"
                            value={editData.nombre_nino ?? c.nombre_nino}
                            onChange={e => setEditData(ed => ({ ...ed, nombre_nino: e.target.value }))}
                          />
                        ) : c.nombre_nino}
                      </td>
                      <td className="col-last">
                        {isEditing ? (
                          <input
                            className="edit-input"
                            type="text"
                            value={editData.apellido_nino ?? c.apellido_nino}
                            onChange={e => setEditData(ed => ({ ...ed, apellido_nino: e.target.value }))}
                          />
                        ) : c.apellido_nino}
                      </td>
                      <td className="col-dni">
                        {isEditing ? (
                          <input
                            className="edit-input"
                            type="text"
                            value={editData.dni_nino ?? c.dni_nino}
                            onChange={e => setEditData(ed => ({ ...ed, dni_nino: e.target.value }))}
                          />
                        ) : c.dni_nino}
                      </td>
                      <td className="col-cert">{c.certificado_discapacidad ? 'SI' : 'NO'}</td>
                      <td className="col-os">{c.obra_social?.nombre || '—'}</td>
                      <td className="col-resp">
                        {Array.isArray(c.responsables) && c.responsables.length > 0 ? (
                          c.responsables[0].responsable
                            ? `${c.responsables[0].responsable.nombre_responsable} ${c.responsables[0].responsable.apellido_responsable}${c.responsables[0].es_principal ? '*' : ''}`
                            : '—'
                        ) : '—'}
                      </td>
                      <td className="col-state">
                        <span className={`pill ${estadoKey}`}>{ESTADOS.find(e => e.key === estadoKey)?.label}</span>
                      </td>
                      <td className="col-actions">
                        <div className="row-actions">
                          <button
                            className="icon-btn info"
                            title="Información"
                            onClick={() => {
                              setModalData(c);
                              setModalOpen(true);
                            }}
                          >
                            <FaInfoCircle size={20} />
                          </button>
                          {isEditing ? (
                            <>
                              <button
                                className="icon-btn save"
                                title="Guardar"
                                onClick={async () => {
                                  try {
                                    await axios.put(API_BASE_URL+`/api/candidatos/${c.id_candidato}`, editData);
                                    setEditId(null);
                                    setEditData({});
                                    await fetchCandidatos(busqueda, page);
                                  } catch {
                                    setError('No se pudo editar el candidato');
                                  }
                                }}
                              >
                                <FaCheck size={18} />
                              </button>
                              <button
                                className="icon-btn cancel"
                                title="Cancelar"
                                onClick={() => {
                                  setEditId(null);
                                  setEditData({});
                                }}
                              >
                                <FaTimes size={18} />
                              </button>
                            </>
                          ) : (
                            <>
                              {ESTADOS.map((e) => (
                                <button
                                  key={e.key}
                                  className={`icon-btn state btn-${e.key}`}
                                  title={e.label}
                                  disabled={actualizando === c.id_candidato + '-' + e.key || c.estado_entrevista === e.key}
                                  onClick={() => cambiarEstado(c.id_candidato, e.key)}
                                >
                                  {e.label}
                                </button>
                              ))}
                              <button
                                className="icon-btn edit"
                                title="Editar"
                                onClick={() => {
                                  setEditId(c.id_candidato);
                                  setEditData({
                                    nombre_nino: c.nombre_nino,
                                    apellido_nino: c.apellido_nino,
                                    dni_nino: c.dni_nino
                                  });
                                }}
                              >
                                <MdEdit size={20} />
                              </button>
                              <button
                                className="icon-btn delete"
                                title="Eliminar"
                                onClick={async () => {
                                  if (window.confirm('¿Seguro que quieres borrar este candidato?')) {
                                    try {
                                      await axios.delete(API_BASE_URL+`/api/candidatos/${c.id_candidato}`);
                                      await fetchCandidatos(busqueda, page);
                                    } catch {
                                      setError('No se pudo borrar el candidato');
                                    }
                                  }
                                }}
                              >
                                <MdDelete size={20} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="paginacion-sweeper">
                <button className="sweeper-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>&#60;</button>
                <span className="sweeper-info">Página {page} de {totalPages}</span>
                <button className="sweeper-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>&#62;</button>
              </div>
            )}
          </>
        )}
      </div>
      {modalOpen && modalData && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-info" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModalOpen(false)}>&times;</button>
            <h2>Información del candidato</h2>
            <div className="modal-section">
              <h3>Niño</h3>
              <div className="modal-row"><span>Nombre:</span> {modalData.nombre_nino}</div>
              <div className="modal-row"><span>Apellido:</span> {modalData.apellido_nino}</div>
              <div className="modal-row"><span>Fecha de nacimiento:</span> {modalData.fecha_nacimiento} ({calcularEdad(modalData.fecha_nacimiento)} años)</div>
              <div className="modal-row"><span>DNI:</span> {modalData.dni_nino}</div>
              <div className="modal-row"><span>Certificado discapacidad:</span> {modalData.certificado_discapacidad ? 'SI' : 'NO'}</div>
              <div className="modal-row"><span>Motivo consulta:</span> {modalData.motivo_consulta}</div>
            </div>
            <div className="modal-section">
              <h3>Responsable</h3>
              {Array.isArray(modalData.responsables) && modalData.responsables.length > 0 && modalData.responsables[0].responsable ? (
                <>
                  <div className="modal-row"><span>Nombre:</span> {modalData.responsables[0].responsable.nombre_responsable}</div>
                  <div className="modal-row"><span>Apellido:</span> {modalData.responsables[0].responsable.apellido_responsable}</div>
                  <div className="modal-row"><span>Email:</span> {modalData.responsables[0].responsable.email}</div>
                  <div className="modal-row"><span>Teléfono:</span> {modalData.responsables[0].responsable.telefono}</div>
                  <div className="modal-row"><span>Parentesco:</span> {modalData.responsables[0].parentesco}</div>
                </>
              ) : <div className="modal-row">No hay responsable principal</div>}
            </div>
            <div className="modal-section">
              <h3>Obra Social</h3>
              <div className="modal-row"><span>Nombre:</span> {modalData.obra_social?.nombre || '—'}</div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

