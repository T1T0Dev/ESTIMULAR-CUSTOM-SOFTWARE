import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { MdEventAvailable, MdChangeCircle, MdDelete } from "react-icons/md";
import { formatDateDMY } from "../utils/date";
import { parseNinosResponse } from "../utils/ninoResponse";
import API_BASE_URL from "../constants/api";
import NuevoTurnoPanel from "../components/NuevoTurnoPanel";
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

const resumirMotivo = (texto, max = 120) => {
  if (!texto) return "";
  const limpio = String(texto).trim();
  if (limpio.length <= max) return limpio;
  return `${limpio.slice(0, max - 1)}…`;
};

const extraerTurnos = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload)) return payload;
  if (payload.data && Array.isArray(payload.data.data)) {
    return payload.data.data;
  }
  return [];
};

const pad = (value) => String(value).padStart(2, "0");

const formatDateForInput = (dateLike) => {
  if (!dateLike) return "";
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const formatTimeForInput = (dateLike) => {
  if (!dateLike) return "";
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const buildPanelNino = (nino) => {
  if (!nino) return null;
  const nombre = nino.nombre || nino.paciente_nombre || "";
  const apellido = nino.apellido || nino.paciente_apellido || "";
  return {
    paciente_id: nino.id_nino,
    id_nino: nino.id_nino,
    paciente_nombre: nombre,
    paciente_apellido: apellido,
    paciente_dni: nino.dni || nino.paciente_dni || null,
    paciente_fecha_nacimiento: nino.fecha_nacimiento || nino.paciente_fecha_nacimiento || null,
    paciente_obra_social: nino.obra_social?.nombre_obra_social || nino.paciente_obra_social || null,
    paciente_responsables: Array.isArray(nino.paciente_responsables)
      ? nino.paciente_responsables
      : Array.isArray(nino.responsables)
        ? nino.responsables
        : [],
    paciente_tipo: nino.tipo || nino.paciente_tipo || "candidato",
  };
};

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
  const [turnoPanelOpen, setTurnoPanelOpen] = useState(false);
  const [turnoPrefill, setTurnoPrefill] = useState(null);
  const [turnoQueue, setTurnoQueue] = useState([]);
  const [turnoNino, setTurnoNino] = useState(null);

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
        const res = await axios.get(`${API_BASE_URL}/api/ninos`, {
          params: { search, page: pageNum, pageSize, tipo: "candidato" },
        });
        const { list: rows, total: totalCount } = parseNinosResponse(res?.data);
        setCandidatos(rows);
        setTotal(totalCount ?? rows.length);
        setError(null);
        // cargar asignaciones actuales por cada candidato (en paralelo simple)
        const asigns = {};
        await Promise.all(
          rows.map(async (c) => {
            try {
              const r = await axios.get(`${API_BASE_URL}/api/turnos`, {
                params: { nino_id: c.id_nino, limit: 1 },
              });
              const turnosData = extraerTurnos(r?.data);
              asigns[c.id_nino] = turnosData[0] || null;
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

  const resetTurnoPanelState = useCallback(() => {
    setTurnoPanelOpen(false);
    setTurnoPrefill(null);
    setTurnoQueue([]);
    setTurnoNino(null);
  }, []);

  const handleTurnoCreadoDesdeEntrevista = useCallback(
    (turnoCreado) => {
      const ninoId = turnoNino?.paciente_id || turnoNino?.id_nino;

      if (turnoCreado && ninoId) {
        setAsignaciones((prev) => ({
          ...prev,
          [ninoId]: turnoCreado,
        }));
      }

      setTurnoQueue((prevQueue) => {
        if (prevQueue.length === 0) {
          resetTurnoPanelState();
          Swal.fire({
            icon: "success",
            title: "Turnos completados",
            text: "Se crearon todos los turnos sugeridos.",
            timer: 1800,
            showConfirmButton: false,
            toast: true,
            position: "top-end",
          });
          fetchCandidatos(busqueda, page);
          return [];
        }

        const [nextPrefill, ...rest] = prevQueue;
        setTurnoPrefill(nextPrefill);

        if (rest.length === 0) {
          Swal.fire({
            icon: "info",
            title: "Turno creado",
            text: "Queda 1 turno sugerido por cargar.",
            timer: 1800,
            showConfirmButton: false,
            toast: true,
            position: "top-end",
          });
        } else {
          Swal.fire({
            icon: "info",
            title: "Turno creado",
            text: `Quedan ${rest.length + 1} turnos sugeridos por cargar.`,
            timer: 2000,
            showConfirmButton: false,
            toast: true,
            position: "top-end",
          });
        }

        return rest;
      });
    },
    [busqueda, fetchCandidatos, page, resetTurnoPanelState, setAsignaciones, turnoNino]
  );

  const handleCloseTurnoPanel = useCallback(() => {
    resetTurnoPanelState();
  }, [resetTurnoPanelState]);

  async function programarTurnosEntrevista(nino, { replaceExisting = false } = {}) {
    if (!nino?.id_nino) return;

    if (replaceExisting) {
      const confirmacion = await Swal.fire({
        title: "Reprogramar turnos",
        text: "Se cancelarán los turnos automáticos pendientes y se generarán nuevos en el próximo lunes disponible. ¿Deseas continuar?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, reprogramar",
        cancelButtonText: "Cancelar",
      });

      if (!confirmacion.isConfirmed) {
        return;
      }
    }

    try {
      Swal.fire({
        title: "Programando turnos...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      const response = await axios.post(`${API_BASE_URL}/api/turnos/auto-schedule`, {
        nino_id: nino.id_nino,
        replace_existing: replaceExisting,
      });

      const suggestions = response?.data?.data || {};
      const propuestas = Array.isArray(suggestions?.propuestas)
        ? suggestions.propuestas
        : [];
      const omitidos = Array.isArray(suggestions?.omitidos)
        ? suggestions.omitidos
        : [];

      Swal.close();

      if (propuestas.length === 0) {
        const message = omitidos.length > 0
          ? "Todas las profesiones requeridas ya tienen turnos pendientes o confirmados."
          : "No se encontraron turnos disponibles en los próximos lunes.";
        Swal.fire({
          icon: omitidos.length > 0 ? "info" : "warning",
          title: "Sin propuestas",
          text: message,
        });
        return;
      }

      const prefillList = propuestas.map((propuesta) => {
        const inicio = propuesta.inicio || suggestions?.slot?.inicio;
        const inicioDate = inicio ? new Date(inicio) : null;

        return {
          ...propuesta,
          inicio,
          date: formatDateForInput(inicioDate),
          startTime: formatTimeForInput(inicioDate),
          profesional_ids: Array.isArray(propuesta.profesional_ids)
            ? propuesta.profesional_ids.map((id) => Number(id)).filter((id) => !Number.isNaN(id))
            : [],
          consultorio_id: propuesta.consultorio_id ?? null,
          estado: propuesta.estado || "pendiente",
        };
      });

      setTurnoNino(buildPanelNino(nino));
      setTurnoPrefill(prefillList[0]);
      setTurnoQueue(prefillList.slice(1));
      setTurnoPanelOpen(true);

      const nombresServicios = prefillList
        .map((prefill) => prefill.departamento_nombre)
        .filter(Boolean);

      const mensajeToast = (() => {
        const serviciosTexto = nombresServicios.length > 0
          ? ` Servicios sugeridos: ${nombresServicios.join(', ')}.`
          : '';

        if (omitidos.length > 0) {
          return `Se generaron ${prefillList.length} propuesta(s). ${omitidos.length} servicio(s) ya tenían turno activo.${serviciosTexto}`;
        }

        return `Revisá el formulario antes de confirmar la creación del turno.${serviciosTexto}`;
      })();

      Swal.fire({
        icon: "success",
        title:
          prefillList.length === 1
            ? "Propuesta lista"
            : `${prefillList.length} propuestas listas`,
        text: mensajeToast,
        toast: true,
        timer: 2400,
        position: "top-end",
        showConfirmButton: false,
      });
    } catch (e) {
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "No se pudieron programar turnos",
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
      await axios.post(`${API_BASE_URL}/api/turnos/auto-schedule/cancel`, {
        nino_id: ninoId,
      });
      await axios.put(`${API_BASE_URL}/api/turnos/${turnoId}`, {
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
                    <th className="col-motivo">Motivo consulta</th>
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
                        <td className="col-motivo">
                          {c.motivo_consulta ? (
                            <span
                              className="motivo-text"
                              title={c.motivo_consulta}
                            >
                              {resumirMotivo(c.motivo_consulta)}
                            </span>
                          ) : (
                            <span className="muted">Sin motivo</span>
                          )}
                        </td>
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
                              onClick={() => programarTurnosEntrevista(c, { replaceExisting: !!asig })}
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

      <NuevoTurnoPanel
        isOpen={turnoPanelOpen}
        onClose={handleCloseTurnoPanel}
        onCreated={handleTurnoCreadoDesdeEntrevista}
        defaultDate={turnoPrefill?.inicio ? new Date(turnoPrefill.inicio) : undefined}
        loggedInProfesionalId={null}
        initialNino={turnoNino}
        prefillData={turnoPrefill}
      />
    </section>
  );
}
