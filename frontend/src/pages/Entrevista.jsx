import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { MdEventAvailable, MdChangeCircle, MdDelete } from "react-icons/md";
import { formatDateDMY } from "../utils/date";
import { parseNinosResponse } from "../utils/ninoResponse";
import API_BASE_URL from "../constants/api";
import NuevoTurnoPanel from "../components/NuevoTurnoPanel";
import ProfesionalesSelectorModal from "../components/ProfesionalesSelectorModal";
import useAuthStore from "../store/useAuthStore";

// Estilos
import "../styles/Entrevista.css";

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

const normalizeProfesionalId = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && !Number.isNaN(parsed) ? parsed : null;
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
    paciente_obra_social_descuento:
      typeof nino.paciente_obra_social_descuento === "number"
        ? nino.paciente_obra_social_descuento
        : typeof nino.obra_social?.descuento === "number"
        ? nino.obra_social.descuento
        : null,
    paciente_responsables: Array.isArray(nino.paciente_responsables)
      ? nino.paciente_responsables
      : Array.isArray(nino.responsables)
        ? nino.responsables
        : [],
    paciente_tipo: nino.tipo || nino.paciente_tipo || "candidato",
  };
};

const parseInicioDate = (propuesta) => {
  if (!propuesta) return null;
  if (propuesta.inicio) {
    const inicioDate = new Date(propuesta.inicio);
    if (!Number.isNaN(inicioDate.getTime())) {
      return inicioDate;
    }
  }
  if (propuesta.date && propuesta.startTime) {
    const combined = new Date(`${propuesta.date}T${propuesta.startTime}`);
    if (!Number.isNaN(combined.getTime())) {
      return combined;
    }
  }
  return null;
};

const mergePropuestasEnTurnoUnico = (propuestas) => {
  if (!Array.isArray(propuestas) || propuestas.length === 0) return null;

  const base = propuestas[0];
  const baseInicioDate = parseInicioDate(base);
  if (!baseInicioDate) return null;

  const inicioIso = baseInicioDate.toISOString();
  const duracionMax = Math.max(
    ...propuestas.map((p) => {
      const dur = Number(p.duracion_min);
      return Number.isFinite(dur) && dur > 0 ? dur : 60;
    })
  );
  const finDate = new Date(baseInicioDate);
  finDate.setMinutes(finDate.getMinutes() + duracionMax);
  const finIso = finDate.toISOString();

  const profesionalesIds = [];
  const profesionalesSet = new Map();
  propuestas.forEach((propuesta) => {
    const profs = Array.isArray(propuesta.profesional_ids)
      ? propuesta.profesional_ids
      : [];
    profs.forEach((profId) => {
      const normalized = normalizeProfesionalId(profId);
      if (normalized !== null && !profesionalesSet.has(normalized)) {
        profesionalesSet.set(normalized, true);
        profesionalesIds.push(normalized);
      }
    });
  });

  const ordenadas = propuestas.sort((a, b) => {
    const aInicio = parseInicioDate(a);
    const bInicio = parseInicioDate(b);
    if (!aInicio && !bInicio) return 0;
    if (!aInicio) return 1;
    if (!bInicio) return -1;
    return aInicio.getTime() - bInicio.getTime();
  });

  const profesionalesResumen = ordenadas
    .map((propuesta) => {
      const info = {
        nombre_completo: propuesta.profesional_nombre || "Profesional sin nombre",
        departamentos: new Set(),
      };
      if (propuesta.departamento_nombre) {
        info.departamentos.add(propuesta.departamento_nombre);
      }
      return info;
    })
    .reduce((acc, info) => {
      const existing = acc.find((item) =>
        item.nombre_completo === info.nombre_completo
      );
      if (existing) {
        info.departamentos.forEach((dept) => existing.departamentos.add(dept));
      } else {
        acc.push({
          nombre_completo: info.nombre_completo,
          departamentos: new Set(info.departamentos),
        });
      }
      return acc;
    }, [])
    .map((info) => ({
      nombre_completo: info.nombre_completo,
      departamentos: Array.from(info.departamentos.values()),
    }));

  const consultorioIds = ordenadas
    .map((item) => item.consultorio_id)
    .filter((valor) => valor !== undefined && valor !== null);
  const consultorioId =
    consultorioIds.length > 0 &&
    consultorioIds.every((valor) => String(valor) === String(consultorioIds[0]))
      ? consultorioIds[0]
      : null;

  const departamentos = [];
  const departamentosSet = new Set();
  ordenadas.forEach((propuesta) => {
    const deptId = normalizeProfesionalId(propuesta.departamento_id);
    const key =
      deptId !== null
        ? `id-${deptId}`
        : `nombre-${propuesta.departamento_nombre || "?"}`;
    if (departamentosSet.has(key)) return;
    departamentosSet.add(key);
    departamentos.push({
      id_departamento: deptId,
      nombre: propuesta.departamento_nombre || "Servicio sin nombre",
    });
  });

  const departamentosResumen = departamentos
    .map((dep) => dep.nombre)
    .filter((nombre) => typeof nombre === "string" && nombre.trim().length > 0);

  const serviciosResumen =
    departamentosResumen.length > 1
      ? departamentosResumen.join(", ")
      : departamentosResumen[0] || base.departamento_nombre || "Entrevista";

  const notasPartes = [];
  ordenadas.forEach((propuesta) => {
    if (propuesta.notas && String(propuesta.notas).trim().length > 0) {
      notasPartes.push(String(propuesta.notas).trim());
    }
  });

  if (profesionalesResumen.length > 0) {
    const resumenProfesionales = profesionalesResumen
      .map((prof) => {
        const sectores =
          Array.isArray(prof.departamentos) && prof.departamentos.length > 0
            ? ` (${prof.departamentos.join(", ")})`
            : "";
        return `${prof.nombre_completo}${sectores}`;
      })
      .join(" · ");
    notasPartes.push(`Profesionales asignados: ${resumenProfesionales}`);
  }

  const notasFinales =
    notasPartes.length > 0
      ? Array.from(new Set(notasPartes)).join(" | ")
      : base.notas || null;

  const unionDisponibles = new Map();
  ordenadas.forEach((propuesta) => {
    const disponibles = Array.isArray(propuesta.profesionales_disponibles)
      ? propuesta.profesionales_disponibles
      : [];
    disponibles.forEach((prof) => {
      const profId = normalizeProfesionalId(prof?.id_profesional);
      if (profId === null) return;
      if (!unionDisponibles.has(profId)) {
        unionDisponibles.set(profId, {
          ...prof,
          id_profesional: profId,
        });
      }
    });
  });

  const profesionalesDisponiblesUnificados = Array.from(unionDisponibles.values());

  const departamentoPrincipalId =
    base.departamento_id !== undefined && base.departamento_id !== null
      ? base.departamento_id
      : departamentos[0]?.id_departamento || "";

  const departamentoPrincipalNombre =
    departamentosResumen.length > 1
      ? `Entrevista (${serviciosResumen})`
      : base.departamento_nombre || departamentosResumen[0] || "Entrevista";

  const resultado = {
    ...base,
    inicio: inicioIso,
    fin: finIso,
    date: formatDateForInput(baseInicioDate),
    startTime: formatTimeForInput(baseInicioDate),
    duracion_min: duracionMax,
    consultorio_id: consultorioId,
    profesional_ids: profesionalesIds,
    profesionales_disponibles: profesionalesDisponiblesUnificados,
    departamento_id: departamentoPrincipalId,
    departamento_nombre: departamentoPrincipalNombre,
    servicios_resumen: serviciosResumen,
    departamentos_resumen: departamentosResumen,
    profesionales_resumen: profesionalesResumen,
    notas: notasFinales,
    departamento_bloqueado: true,
  };

  delete resultado.__inicioDate;

  return resultado;
};

export default function Entrevista() {
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
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorPropuestas, setSelectorPropuestas] = useState([]);
  const [selectorOmitidos, setSelectorOmitidos] = useState([]);

  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.es_admin || (user?.roles?.some(role => role.nombre?.toLowerCase() === 'admin'));
  const isProfesional = user?.roles?.some(role => role.nombre?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === 'profesional');

  // Detectar si estamos en móvil
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loggedInProfesionalId = useMemo(() => {
    if (profile?.id_profesional) {
      return profile.id_profesional;
    }
    if (user?.id_profesional) {
      return user.id_profesional;
    }
    if (user?.id) {
      return user.id;
    }
    return null;
  }, [profile?.id_profesional, user?.id_profesional, user?.id]);

  const currentUserId = user?.id ?? null;

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

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayStartMs = todayStart.getTime();
        const todayStartIso = new Date(todayStart).toISOString();

        const isTurnoVigente = (turno) => {
          if (!turno?.inicio) return false;
          const inicioDate = new Date(turno.inicio);
          if (Number.isNaN(inicioDate.getTime())) return false;
          const inicioDay = new Date(inicioDate);
          inicioDay.setHours(0, 0, 0, 0);
          return inicioDay.getTime() >= todayStartMs;
        };

        // cargar asignaciones actuales por cada candidato (en paralelo simple)
        const asigns = {};
        await Promise.all(
          rows.map(async (c) => {
            try {
              const r = await axios.get(`${API_BASE_URL}/api/turnos`, {
                params: { nino_id: c.id_nino, limit: 5, desde: todayStartIso },
              });
              const turnosData = extraerTurnos(r?.data);
              const turnoVigente = turnosData.find(isTurnoVigente) || null;
              asigns[c.id_nino] = turnoVigente;
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

  const launchTurnoCreationFlow = useCallback(
    (prefillList, omitidosList = []) => {
      if (!Array.isArray(prefillList) || prefillList.length === 0) {
        resetTurnoPanelState();
        Swal.fire({
          icon: "info",
          title: "Sin propuestas",
          text: "No hay turnos para crear con la selección actual.",
          toast: true,
          timer: 2200,
          position: "top-end",
          showConfirmButton: false,
        });
        return;
      }

      setTurnoPrefill(prefillList[0]);
      setTurnoQueue(prefillList.slice(1));
      setTurnoPanelOpen(true);

      const nombresServicios = prefillList
        .map((prefill) => prefill.servicios_resumen || prefill.departamento_nombre)
        .filter(Boolean);

      const serviciosTexto = nombresServicios.length > 0
        ? ` Servicios: ${nombresServicios.join(", ")}.`
        : "";

      const esUnico = prefillList.length === 1;
      const mensajeToast = omitidosList.length > 0
        ? `Se ${esUnico ? "generará" : "generarán"} ${prefillList.length} ${esUnico ? "turno" : "turnos"}. ${omitidosList.length} servicio(s) ya tenían turno activo.${serviciosTexto}`
        : esUnico
          ? `Revisá los datos y confirmá el turno.${serviciosTexto}`
          : `Revisá los datos y confirmá cada turno.${serviciosTexto}`;

      Swal.fire({
        icon: "success",
        title:
          prefillList.length === 1
            ? "Turno listo"
            : `${prefillList.length} propuestas listas`,
        text: mensajeToast,
        toast: true,
        timer: 2600,
        position: "top-end",
        showConfirmButton: false,
      });
    },
    [resetTurnoPanelState]
  );

  const handleProfesionalesConfirm = useCallback(
    (actualizadas) => {
      const omitidosActuales = selectorOmitidos;
      setSelectorOpen(false);
      setSelectorPropuestas([]);
      setSelectorOmitidos([]);

      if (!Array.isArray(actualizadas) || actualizadas.length === 0) {
        Swal.fire({
          icon: "info",
          title: "Sin propuestas",
          text: "No hay turnos para crear con la selección actual.",
          toast: true,
          timer: 2200,
          position: "top-end",
          showConfirmButton: false,
        });
        return;
      }

      const turnoUnico = mergePropuestasEnTurnoUnico(actualizadas);

      if (!turnoUnico) {
        Swal.fire({
          icon: "info",
          title: "Sin propuestas",
          text: "No se pudo construir el turno combinado. Revisá la selección e intentá nuevamente.",
          toast: true,
          timer: 2200,
          position: "top-end",
          showConfirmButton: false,
        });
        return;
      }

      launchTurnoCreationFlow([turnoUnico], omitidosActuales);
    },
    [launchTurnoCreationFlow, selectorOmitidos]
  );

  const handleProfesionalesCancel = useCallback(() => {
    setSelectorOpen(false);
    setSelectorPropuestas([]);
    setSelectorOmitidos([]);
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

  const programarTurnosEntrevista = useCallback(
    async (candidato, options = {}) => {
      const { replaceExisting = false } = options;

      try {
        const ninoPanel = buildPanelNino(candidato);
        if (!ninoPanel) {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo preparar los datos del candidato.",
          });
          return;
        }

        setTurnoNino(ninoPanel);

        const response = await axios.post(
          `${API_BASE_URL}/api/turnos/auto-schedule`,
          {
            nino_id: candidato.id_nino,
            tipo_turno: "entrevista",
            replace_existing: replaceExisting,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        const payload = response?.data;
        const suggestions = Array.isArray(payload)
          ? { propuestas: payload }
          : typeof payload === "object" && payload !== null
            ? typeof payload.data === "object" && payload.data !== null
              ? payload.data
              : payload
            : {};

        const propuestas = Array.isArray(suggestions?.propuestas)
          ? suggestions.propuestas
          : [];
        const omitidos = Array.isArray(suggestions?.omitidos)
          ? suggestions.omitidos
          : [];

        if (propuestas.length === 0) {
          const message = omitidos.length > 0
            ? "Todas las profesiones requeridas ya tienen turnos pendientes o confirmados."
            : "No se encontraron turnos disponibles en los próximos lunes.";
          Swal.fire({
            icon: omitidos.length > 0 ? "info" : "warning",
            title: "Sin disponibilidad",
            text: message,
          });
          return;
        }

        if (propuestas.length === 1) {
          const turnoUnico = mergePropuestasEnTurnoUnico(propuestas);
          if (turnoUnico) {
            launchTurnoCreationFlow([turnoUnico], omitidos);
          } else {
            Swal.fire({
              icon: "error",
              title: "Error",
              text: "No se pudo procesar la propuesta de turno.",
            });
          }
        } else {
          setSelectorPropuestas(propuestas);
          setSelectorOmitidos(omitidos);
          setSelectorOpen(true);
        }
      } catch (error) {
        console.error("Error al programar turnos de entrevista:", error);
        const mensaje = error.response?.data?.message || "Error al programar turnos";
        Swal.fire({
          icon: "error",
          title: "Error",
          text: mensaje,
        });
      }
    },
    [launchTurnoCreationFlow]
  );

  const quitarAsignacion = useCallback(
    async (turnoId, ninoId) => {
      const result = await Swal.fire({
        title: "¿Quitar asignación?",
        text: "Se eliminará el turno asignado a este candidato.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Sí, quitar",
        cancelButtonText: "Cancelar",
      });

      if (!result.isConfirmed) return;

      try {
        await axios.delete(`${API_BASE_URL}/api/turnos/${turnoId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        setAsignaciones((prev) => ({
          ...prev,
          [ninoId]: null,
        }));

        Swal.fire({
          icon: "success",
          title: "Asignación quitada",
          text: "El turno ha sido removido exitosamente.",
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
        });
      } catch (e) {
        console.error("Error al quitar asignación:", e);
        Swal.close();
        Swal.fire({
          icon: "error",
          title: "No se pudo quitar",
          text: e?.response?.data?.message || "Intenta nuevamente",
        });
      }
    },
    []
  );

  return (
    <>
      <ProfesionalesSelectorModal
        isOpen={selectorOpen}
        propuestas={selectorPropuestas}
        onCancel={handleProfesionalesCancel}
        onConfirm={handleProfesionalesConfirm}
      />

      <div className="entrevistas-page">
        <div className="entrevistas-header">
          <h1>Entrevistas</h1>
          <p>Gestiona las entrevistas pendientes de candidatos</p>
        </div>

        <div className="entrevistas-content">
          <div className="ninos-top">
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
              <div className="loader">Cargando candidatos...</div>
            ) : error ? (
              <div className="error">{error}</div>
            ) : candidatos.length === 0 ? (
              <div className="empty">No hay candidatos pendientes de entrevista.</div>
            ) : (
              <>
                <div className="table-tools">
                  <div className="left">
                    <div className="meta">{total} candidatos pendientes</div>
                  </div>
                  <div className="right">
                    <div className="meta">
                      Página {page} de {totalPages}
                    </div>
                  </div>
                </div>

                {isMobile ? (
                  /* Vista de tarjetas para móviles */
                  <div className="mobile-cards">
                    {candidatos.map((c) => {
                      const asig = asignaciones[c.id_nino] || null;
                      const obra = c.obra_social?.nombre_obra_social || "—";
                      return (
                        <div key={c.id_nino} className="mobile-card">
                          <div className="mobile-card-header">
                            <div>
                              <div className="mobile-card-name">
                                {c.nombre} {c.apellido}
                              </div>
                              <div className="mobile-card-dni">
                                DNI: {c.dni || "No especificado"}
                              </div>
                            </div>
                            <div className={`mobile-card-status ${asig ? 'assigned' : 'unassigned'}`}>
                              {asig ? 'Asignado' : 'Pendiente'}
                            </div>
                          </div>

                          <div className="mobile-card-info">
                            <div className="mobile-card-field">
                              <span className="mobile-card-label">Edad</span>
                              <span className="mobile-card-value">
                                {c.fecha_nacimiento
                                  ? `${edad(c.fecha_nacimiento)} años`
                                  : "No especificada"}
                              </span>
                            </div>
                            <div className="mobile-card-field">
                              <span className="mobile-card-label">Obra Social</span>
                              <span className="mobile-card-value">{obra}</span>
                            </div>
                            <div className="mobile-card-field">
                              <span className="mobile-card-label">Fecha Nac.</span>
                              <span className="mobile-card-value">
                                {c.fecha_nacimiento
                                  ? formatDateDMY(c.fecha_nacimiento)
                                  : "No especificada"}
                              </span>
                            </div>
                            <div className="mobile-card-field">
                              <span className="mobile-card-label">Turno</span>
                              <span className="mobile-card-value">
                                {asig ? (
                                  <div className="turno-chip">
                                    {new Date(asig.inicio).toLocaleDateString()}
                                  </div>
                                ) : (
                                  <span className="muted">Sin asignar</span>
                                )}
                              </span>
                            </div>
                          </div>

                          {c.motivo_consulta && (
                            <div className="mobile-card-motivo">
                              <div className="mobile-card-label">Motivo de consulta</div>
                              <div className="mobile-card-value">{c.motivo_consulta}</div>
                            </div>
                          )}

                          <div className="mobile-card-actions">
                            {(isAdmin || isProfesional) && (
                              <>
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
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="dashboard-table-wrapper">
                    <table
                      className="table candidatos-table"
                      role="table"
                      aria-label="Candidatos pendientes de entrevista"
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
                                  {(isAdmin || isProfesional) && (
                                    <>
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
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

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
        </div>
      </div>

      <NuevoTurnoPanel
        isOpen={turnoPanelOpen}
        onClose={handleCloseTurnoPanel}
        onCreated={handleTurnoCreadoDesdeEntrevista}
        defaultDate={turnoPrefill?.inicio ? new Date(turnoPrefill.inicio) : undefined}
        loggedInProfesionalId={loggedInProfesionalId}
        initialNino={turnoNino}
        prefillData={turnoPrefill}
      />
    </>
  );
}



