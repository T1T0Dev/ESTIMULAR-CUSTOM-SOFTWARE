import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { MdEventAvailable, MdChangeCircle, MdDelete } from "react-icons/md";
import { formatDateDMY } from "../utils/date";
import "../styles/NinosPage.css"; // reutilizamos estilos base
import "../styles/AsignarEntrevista.css";

// Utilidad local para edad
function edad(fechaNacimiento) {
  if (!fechaNacimiento) return "";
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  let e = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--;
  return e;
}

export default function AsignarEntrevista() {
  const [candidatos, setCandidatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  // asignaciones por nino_id -> turno (o null)
  const [asignaciones, setAsignaciones] = useState({});

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalNino, setModalNino] = useState(null);
  const [turnosDisp, setTurnosDisp] = useState([]);
  const [loadingTurnos, setLoadingTurnos] = useState(false);

  const debouncedBusqueda = useDebounce(busqueda, 300);
  const skipPageEffectRef = useRef(false);

  function useDebounce(value, delay) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
      const t = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
  }

  const fetchCandidatos = useCallback(
    async (search = "", pageNum = 1) => {
      setLoading(true);
      try {
        const res = await axios.get("http://localhost:5000/api/ninos", {
          params: { search, page: pageNum, pageSize, tipo: "candidato" },
        });
        const rows = res?.data?.data || [];
        setCandidatos(rows);
        setTotal(res?.data?.total || 0);
        setError(null);
        // cargar asignaciones actuales por cada candidato (en paralelo simple)
        const asigns = {};
        await Promise.all(
          rows.map(async (c) => {
            try {
              const r = await axios.get("http://localhost:5000/api/turnos", {
                params: { nino_id: c.id_nino, limit: 1 },
              });
              asigns[c.id_nino] = (r?.data?.data || [])[0] || null;
            } catch (error) {
              console.error("No se pudo obtener turno asignado", error);
              asigns[c.id_nino] = null;
            }
          })
        );
        setAsignaciones(asigns);
      } catch (e) {
        console.error("Error al obtener candidatos:", e);
        setError("Error al obtener candidatos");
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  useEffect(() => {
    skipPageEffectRef.current = true;
    setPage(1);
    fetchCandidatos(debouncedBusqueda, 1);
  }, [debouncedBusqueda, fetchCandidatos]);

  useEffect(() => {
    if (skipPageEffectRef.current) {
      skipPageEffectRef.current = false;
      return;
    }
    fetchCandidatos(busqueda, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = useMemo(() => Math.ceil(total / pageSize), [total]);

  async function abrirModalAsignar(nino) {
    setModalNino(nino);
    setModalOpen(true);
    setLoadingTurnos(true);
    try {
      const r = await axios.get("http://localhost:5000/api/turnos", {
        params: { disponible: true, estado: "pendiente", limit: 50 },
      });
      setTurnosDisp(r?.data?.data || []);
    } catch (e) {
      console.error("No se pudieron cargar turnos disponibles", e);
      setTurnosDisp([]);
    } finally {
      setLoadingTurnos(false);
    }
  }

  async function asignarTurno(turnoId, ninoId) {
    try {
      Swal.fire({
        title: "Asignando turno...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      await axios.put(`http://localhost:5000/api/turnos/${turnoId}`, {
        nino_id: ninoId,
      });
      // refrescar asignación del niño
      const r = await axios.get("http://localhost:5000/api/turnos", {
        params: { nino_id: ninoId, limit: 1 },
      });
      setAsignaciones((prev) => ({
        ...prev,
        [ninoId]: (r?.data?.data || [])[0] || null,
      }));
      setModalOpen(false);
      setModalNino(null);
      Swal.close();
      Swal.fire({
        icon: "success",
        title: "Turno asignado",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (e) {
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "No se pudo asignar",
        text: e?.response?.data?.message || "Intenta nuevamente",
      });
    }
  }

  async function quitarAsignacion(turnoId, ninoId) {
    const ok = await Swal.fire({
      title: "¿Quitar asignación?",
      text: "El turno quedará disponible nuevamente.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, quitar",
      cancelButtonText: "Cancelar",
    });
    if (!ok.isConfirmed) return;
    try {
      Swal.fire({
        title: "Quitando...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      await axios.put(`http://localhost:5000/api/turnos/${turnoId}`, {
        nino_id: null,
      });
      setAsignaciones((prev) => ({ ...prev, [ninoId]: null }));
      Swal.close();
      Swal.fire({
        icon: "success",
        title: "Asignación quitada",
        timer: 1100,
        showConfirmButton: false,
      });
    } catch (e) {
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "No se pudo quitar",
        text: e?.response?.data?.message || "Intenta nuevamente",
      });
    }
  }

  return (
    <section className="ninos-page">
      <div className="ninos-top">
        <h1 className="ninos-title">Asignar Entrevista</h1>
        <div className="ninos-controls">
          <form
            className="busqueda-form"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              fetchCandidatos(busqueda, 1);
            }}
          >
            <label className="sr-only" htmlFor="buscar">
              Buscar
            </label>
            <div className="search">
              <input
                id="buscar"
                type="text"
                className="busqueda-input"
                placeholder="Buscar candidato por nombre, apellido o DNI"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </form>
        </div>
      </div>

      <div className="card ninos-card">
        {loading ? (
          <div className="loader">Cargando…</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : candidatos.length === 0 ? (
          <div className="empty">No hay candidatos.</div>
        ) : (
          <>
            <div className="table-tools">
              <div className="left">
                <div className="meta">{total} candidatos</div>
              </div>
              <div className="right">
                <div className="meta">
                  Página {page} de {totalPages}
                </div>
              </div>
            </div>

            <div className="dashboard-table-wrapper">
              <table
                className="table candidatos-table"
                role="table"
                aria-label="Asignar entrevista a candidatos"
              >
                <thead>
                  <tr>
                    <th className="col-dni">DNI</th>
                    <th className="col-name">Nombre</th>
                    <th className="col-last">Apellido</th>
                    <th className="col-dniNac">Edad</th>
                    <th className="col-os">Obra Social</th>
                    <th className="col-turno">Turno asignado</th>
                    <th className="col-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {candidatos.map((c) => {
                    const asig = asignaciones[c.id_nino] || null;
                    const obra = c.obra_social?.nombre_obra_social || "—";
                    return (
                      <tr key={c.id_nino}>
                        <td className="col-dni">{c.dni || "—"}</td>
                        <td className="col-name">{c.nombre}</td>
                        <td className="col-last">{c.apellido}</td>
                        <td className="col-dniNac">
                          {c.fecha_nacimiento
                            ? `${formatDateDMY(c.fecha_nacimiento)} (${edad(
                                c.fecha_nacimiento
                              )} años)`
                            : "—"}
                        </td>
                        <td className="col-os">{obra}</td>
                        <td className="col-turno">
                          {asig ? (
                            <div
                              className="turno-chip"
                              title={`Desde ${formatDateDMY(
                                asig.inicio
                              )} a ${formatDateDMY(asig.fin)}`}
                            >
                              <span>
                                {new Date(asig.inicio).toLocaleString()}
                              </span>
                            </div>
                          ) : (
                            <span className="muted">Sin asignar</span>
                          )}
                        </td>
                        <td className="col-actions">
                          <div className="row-actions">
                            <button
                              className="icon-btn success"
                              title={asig ? "Cambiar turno" : "Asignar turno"}
                              onClick={() => abrirModalAsignar(c)}
                            >
                              {asig ? (
                                <MdChangeCircle size={20} />
                              ) : (
                                <MdEventAvailable size={20} />
                              )}
                            </button>
                            {asig && (
                              <button
                                className="icon-btn danger"
                                title="Quitar asignación"
                                onClick={() =>
                                  quitarAsignacion(asig.id, c.id_nino)
                                }
                              >
                                <MdDelete size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="paginacion-sweeper">
                <button
                  className="sweeper-btn"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  &lt;
                </button>
                <span className="sweeper-info">
                  Página {page} de {totalPages}
                </span>
                <button
                  className="sweeper-btn"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  &gt;
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-info" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModalOpen(false)}>
              &times;
            </button>
            <h2>Seleccionar turno disponible</h2>
            {modalNino && (
              <div className="modal-section">
                <div className="modal-grid">
                  <div className="label">Candidato</div>
                  <div className="value">
                    {modalNino.nombre} {modalNino.apellido}
                  </div>
                  <div className="label">DNI</div>
                  <div className="value">{modalNino.dni || "—"}</div>
                </div>
              </div>
            )}
            <div className="modal-section">
              {loadingTurnos ? (
                <div className="loader">Cargando turnos…</div>
              ) : turnosDisp.length === 0 ? (
                <div className="empty">No hay turnos disponibles</div>
              ) : (
                <div className="turnos-grid">
                  {turnosDisp.map((t) => (
                    <button
                      key={t.id}
                      className="turno-card"
                      onClick={() => asignarTurno(t.id, modalNino.id_nino)}
                    >
                      <div className="turno-card-top">
                        <div className="turno-fecha">
                          {new Date(t.inicio).toLocaleDateString()}
                        </div>
                        <div className="turno-hora">
                          {new Date(t.inicio).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <div className="turno-duracion">{t.duracion_min} min</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
