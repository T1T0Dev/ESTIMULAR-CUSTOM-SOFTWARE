import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { MdEventAvailable, MdGroups, MdInfo, MdFilterList } from "react-icons/md";
import { formatDateDMY } from "../utils/date";
import { parseNinosResponse } from "../utils/ninoResponse";
import API_BASE_URL from "../constants/api";
import NuevoTurnoPanel from "../components/NuevoTurnoPanel";
import ProfesionalesSelectorModal from "../components/ProfesionalesSelectorModal";
import useAuthStore from "../store/useAuthStore";
import "../styles/Entrevista.css";
// Utilidades necesarias
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

// Arma el objeto paciente para el panel de creación de turno
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

const mergePropuestasEnTurnoUnico = (propuestas = []) => {
  if (!Array.isArray(propuestas) || propuestas.length === 0) {
    return null;
  }

  const enriquecidas = propuestas
    .map((propuesta) => {
      const inicioDate = parseInicioDate(propuesta);
      if (!inicioDate) return null;
      return { ...propuesta, __inicioDate: inicioDate };
    })
    .filter(Boolean);

  if (enriquecidas.length === 0) {
    return null;
  }

  const ordenadas = [...enriquecidas].sort(
    (a, b) => a.__inicioDate.getTime() - b.__inicioDate.getTime()
  );

  const base = { ...ordenadas[0] };
  const baseInicioDate = base.__inicioDate;
  const inicioIso = baseInicioDate.toISOString();

  const duraciones = ordenadas
    .map((item) => Number(item.duracion_min))
    .filter((value) => Number.isFinite(value) && value > 0);
  const duracionMax = duraciones.length > 0 ? Math.max(...duraciones) : 30;

  const finDate = new Date(baseInicioDate.getTime() + duracionMax * 60000);
  const finIso = finDate.toISOString();

  const profesionalInfoMap = new Map();
  const profesionalesSet = new Set();

  ordenadas.forEach((propuesta) => {
    const disponibles = Array.isArray(propuesta.profesionales_disponibles)
      ? propuesta.profesionales_disponibles
      : [];

    (propuesta.profesional_ids || []).forEach((rawId) => {
      const profId = normalizeProfesionalId(rawId);
      if (profId === null) return;

      profesionalesSet.add(profId);

      const existente = profesionalInfoMap.get(profId) || {
        id_profesional: profId,
        nombre_completo: null,
        departamentos: new Set(),
      };

      const encontrado = disponibles.find(
        (prof) => normalizeProfesionalId(prof?.id_profesional) === profId
      );

      if (encontrado) {
        const nombreCompleto =
          encontrado.nombre_completo ||
          [encontrado.nombre, encontrado.apellido]
            .filter(Boolean)
            .join(" ")
            .trim();
        if (nombreCompleto) {
          existente.nombre_completo = nombreCompleto;
        }
        if (encontrado.departamento_nombre) {
          existente.departamentos.add(encontrado.departamento_nombre);
        }
      }

      if (propuesta.departamento_nombre) {
        existente.departamentos.add(propuesta.departamento_nombre);
      }

      if (!existente.nombre_completo) {
        existente.nombre_completo = `Profesional ${profId}`;
      }

      profesionalInfoMap.set(profId, existente);
    });
  });

  const profesionalesIds = Array.from(profesionalesSet.values());

  const profesionalesResumen = Array.from(profesionalInfoMap.values()).map((info) => ({
    id_profesional: info.id_profesional,
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

  return {
    ...base,
    inicio: inicioIso,
    fin: finIso,
    date: formatDateForInput(baseInicioDate),
    startTime: formatTimeForInput(baseInicioDate),
    duracion_min: duracionMax,
    consultorio_id: consultorioId,
    profesional_ids: profesionalesIds,
    profesionales_disponibles: profesionalesDisponiblesUnificados,
    departamento_id: base.departamento_id ?? departamentos[0]?.id_departamento ?? null,
    departamento_nombre: base.departamento_nombre ?? departamentos[0]?.nombre ?? null,
    servicios_resumen: serviciosResumen,
    departamentos_resumen: departamentosResumen,
    profesionales_resumen: profesionalesResumen,
    notas: notasFinales,
    departamento_bloqueado: true,
    lockSchedulingFields: true,
  };
};

export default function Entrevista() {
  const [candidatos, setCandidatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  // Entrevistas pendientes + filtros
  const [entrevistas, setEntrevistas] = useState([]);
  const [loadingEntrevistas, setLoadingEntrevistas] = useState(true);
  const [departamentos, setDepartamentos] = useState([]);
  const [deptFilter, setDeptFilter] = useState("all");
  const [expandedDetalleId, setExpandedDetalleId] = useState(null);

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
  const token = useAuthStore((state) => state.token);
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

  // Cargar catálogo de departamentos y construir entrevistas pendientes desde candidatos/asignaciones
  const fetchCatalogosYEntrevistas = useCallback(async (rows = [], asigns = {}) => {
    try {
      setLoadingEntrevistas(true);
      // Catálogo de departamentos
      try {
        const formDataRes = await axios.get(`${API_BASE_URL}/api/turnos/form-data`);
        const deps = formDataRes?.data?.data?.departamentos || formDataRes?.data?.departamentos || [];
        setDepartamentos(deps);
      } catch (e) {
        console.warn('No se pudo cargar catálogo de departamentos:', e);
      }

      // Candidatos sin turno asignado
      const pendientesCandidatos = rows.filter((c) => !asigns[c.id_nino]);

      if (pendientesCandidatos.length === 0) {
        setEntrevistas([]);
        return;
      }

      const lista = pendientesCandidatos.map((c) => {
        const deps = Array.isArray(c?.departamentos)
          ? c.departamentos
              .map((dep) => ({
                id: dep?.departamento_id ?? dep?.id ?? null,
                nombre: dep?.nombre ?? dep?.departamento?.nombre ?? null,
              }))
              .filter((dep) => dep.nombre)
          : [];
        const nombres = deps.map((d) => d.nombre).filter(Boolean);
        const compartida = nombres.length >= 2;
        const principal = deps.length === 1 ? deps[0] : null;
        return {
          id: c.id_nino,
          candidatoRef: c,
          dni: c.dni || null,
          nombre: c.nombre || '',
          apellido: c.apellido || '',
          fecha_nacimiento: c.fecha_nacimiento || null,
          obra_social: c.obra_social?.nombre_obra_social || '—',
          motivo_consulta: c.motivo_consulta || null,
          departamentosInvolucrados: nombres,
          servicio_id: principal?.id ?? null,
          servicio_nombre: principal?.nombre || null,
          compartida,
        };
      });

      setEntrevistas(lista);
    } catch (e) {
      console.error('Error cargando entrevistas pendientes:', e);
    } finally {
      setLoadingEntrevistas(false);
    }
  }, []);

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

        // Construir entrevistas pendientes partiendo de los candidatos y asignaciones
        await fetchCatalogosYEntrevistas(rows, asigns);
      } catch (e) {
        console.error("Error al obtener candidatos:", e);
        setError("Error al obtener candidatos");
      } finally {
        setLoading(false);
      }
    },
    [pageSize, fetchCatalogosYEntrevistas]
  );

  // (definido arriba)

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

      const prefillListWithLocks = prefillList.map((prefill) => ({
        ...prefill,
        departamento_bloqueado: true,
        lockSchedulingFields: true,
      }));

      setTurnoPrefill(prefillListWithLocks[0]);
      setTurnoQueue(prefillListWithLocks.slice(1));
      setTurnoPanelOpen(true);

      const nombresServicios = prefillListWithLocks
        .map((prefill) => prefill.servicios_resumen || prefill.departamento_nombre)
        .filter(Boolean);

      const totalPrefills = prefillListWithLocks.length;
      const serviciosTexto = nombresServicios.length > 0
        ? ` Servicios: ${nombresServicios.join(", ")}.`
        : "";

      const esUnico = totalPrefills === 1;
      const mensajeToast = omitidosList.length > 0
        ? `Se ${esUnico ? "generará" : "generarán"} ${totalPrefills} ${esUnico ? "turno" : "turnos"}. ${omitidosList.length} servicio(s) ya tenían turno activo.${serviciosTexto}`
        : esUnico
          ? `Revisá los datos y confirmá el turno.${serviciosTexto}`
          : `Revisá los datos y confirmá cada turno.${serviciosTexto}`;

      Swal.fire({
        icon: "success",
        title:
          totalPrefills === 1
            ? "Turno listo"
            : `${totalPrefills} propuestas listas`,
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

  // Modal: ver departamentos involucrados
  const openDepartamentosModal = useCallback((row) => {
    const departamentos = Array.isArray(row?.departamentosInvolucrados)
      ? row.departamentosInvolucrados
      : [];
    const deps = Array.isArray(row?.departamentosInvolucrados) ? row.departamentosInvolucrados : [];
    const title = deps.length > 1 ? 'Departamentos involucrados' : 'Departamento asignado';
    const html = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:14px;">
        <div style="font-size:0.95rem;color:#555;">${deps.length} ${deps.length === 1 ? 'servicio' : 'servicios'} ${deps.length > 1 ? 'involucrados' : 'asignado'}</div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-width:640px;">
          ${deps
            .map(
              (d) => `
                <span
                  style="
                    display:inline-flex;align-items:center;gap:8px;
                    padding:10px 14px;border-radius:999px;
                    background: rgba(229,0,125,0.08);
                    color:#e5007d;border:2px solid rgba(229,0,125,0.45);
                    font-weight:700;letter-spacing:0.2px;box-shadow:0 1px 3px rgba(229,0,125,0.15);
                  "
                >
                  <span style="font-size:14px;">🏥</span>
                  <span>${String(d)}</span>
                </span>
              `
            )
            .join('')}
        </div>
      </div>
    `;

    Swal.fire({
      title,
      html,
      icon: deps.length > 1 ? 'info' : undefined,
      width: 600,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#e5007d',
      showClass: { popup: 'swal2-show' },
      hideClass: { popup: 'swal2-hide' },
    });
  }, []);

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
          token
            ? {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            : undefined
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
          // Mostrar el selector también cuando hay un solo departamento.
          const unica = { ...propuestas[0] };
          const disponibles = Array.isArray(unica?.profesionales_disponibles)
            ? [...unica.profesionales_disponibles]
            : [];
          const responsables = disponibles.filter((p) => p?.es_responsable);
          const responsablesIds = responsables
            .map((p) => normalizeProfesionalId(p?.id_profesional))
            .filter((id) => id !== null);

          if (responsablesIds.length > 0) {
            unica.profesional_ids = responsablesIds;
            unica.profesionales_disponibles = disponibles.map((p) => ({
              ...p,
              seleccionado_por_defecto: !!p.es_responsable,
            }));
          } else if (disponibles.length > 0) {
            const firstId = normalizeProfesionalId(disponibles[0]?.id_profesional);
            unica.profesional_ids = firstId !== null ? [firstId] : [];
            unica.profesionales_disponibles = disponibles.map((p, idx) => ({
              ...p,
              seleccionado_por_defecto: idx === 0,
            }));
          }

          setSelectorPropuestas([unica]);
          setSelectorOmitidos(omitidos);
          setSelectorOpen(true);
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
    [launchTurnoCreationFlow, token]
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
        await axios.delete(
          `${API_BASE_URL}/api/turnos/${turnoId}`,
          token
            ? {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            : undefined
        );

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
    [token]
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
          {/* Bloque: Entrevistas pendientes con filtro por departamento */}
          <div className="card ninos-card" style={{ marginBottom: 24 }}>
            <div className="table-tools">
              <div className="left">
                <div className="meta">
                  <MdGroups size={18} style={{ marginRight: 6 }} />
                  Entrevistas pendientes: {entrevistas.length}
                </div>
              </div>
              <div className="right tools-right">
                <div className="tool">
                  <MdFilterList size={18} className="tool-icon" />
                  <label htmlFor="filtro-dep" className="tool-label">
                    Filtro de departamento
                  </label>
                  <select
                    id="filtro-dep"
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="tool-select"
                  >
                    <option value="all">Todos</option>
                    {departamentos.map((d) => (
                      <option key={d.id_departamento} value={String(d.id_departamento)}>
                        {d.nombre}
                      </option>
                    ))}
                    <option value="compartidas">Entrevistas compartidas</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="dashboard-table-wrapper">
              {loadingEntrevistas ? (
                <div className="loader">Cargando entrevistas…</div>
              ) : entrevistas.length === 0 ? (
                <div className="empty">No hay entrevistas pendientes.</div>
              ) : (
                <table className="table" role="table" aria-label="Entrevistas pendientes">
                  <thead>
                    <tr>
                      <th className="col-dni">DNI</th>
                      <th className="col-name">Nombre</th>
                      <th className="col-last">Apellido</th>
                      <th className="col-dniNac">Edad</th>
                      <th className="col-os">Obra Social</th>
                      <th className="col-motivo">Motivo consulta</th>
                      <th className="col-dep">Departamento Asignado</th>
                      <th>Tipo</th>
                      <th>Asignar Turno</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entrevistas
                      .filter((row) => {
                        if (deptFilter === 'all') return true;
                        if (deptFilter === 'compartidas') return row.compartida;
                        const depId = String(row?.servicio_id ?? '');
                        if (depId && depId === String(deptFilter)) return true;
                        // también permitir filtrar por nombre si no hay id
                        const selected = departamentos.find((d) => String(d.id_departamento) === String(deptFilter));
                        if (selected) {
                          return row.departamentosInvolucrados.includes(selected.nombre);
                        }
                        return depId === String(deptFilter);
                      })
                      .map((row) => {
                        const tipoLabel = row.compartida ? 'Entrevista compartida' : 'Entrevista';
                        const expanded = expandedDetalleId === row.id;
                        const birth = row.fecha_nacimiento ? formatDateDMY(row.fecha_nacimiento) : null;
                        return (
                          <>
                            <tr key={row.id}>
                              <td className="col-dni">{row.dni || '—'}</td>
                              <td className="col-name">{row.nombre}</td>
                              <td className="col-last">{row.apellido}</td>
                              <td className="col-dniNac">{birth ? `${birth} (${edad(row.fecha_nacimiento)} años)` : '—'}</td>
                              <td className="col-os">{row.obra_social}</td>
                              <td className="col-motivo">
                                {row.motivo_consulta ? (
                                  <span className="motivo-text" title={row.motivo_consulta}>
                                    {resumirMotivo(row.motivo_consulta)}
                                  </span>
                                ) : (
                                  <span className="muted">Sin motivo</span>
                                )}
                              </td>
                              <td className="col-dep">
                                {row.compartida ? (
                                  <button
                                    type="button"
                                    className="pill pill-shared btn-link"
                                    onClick={() => openDepartamentosModal(row)}
                                    title="Ver departamentos involucrados"
                                  >
                                    <MdInfo size={16} style={{ marginRight: 6 }} /> Ver departamentos
                                  </button>
                                ) : (
                                  row.servicio_nombre || '—'
                                )}
                              </td>
                              <td>
                                <span className={row.compartida ? 'pill pill-shared' : 'pill'} title={row.compartida ? 'Intervención de múltiples departamentos' : 'Entrevista estándar'}>
                                  {row.compartida ? (<MdGroups size={14} style={{ marginRight: 6 }} />) : null}
                                  {tipoLabel}
                                </span>
                              </td>
                              <td>
                                <div className="row-actions">
                                  {(isAdmin || isProfesional) && (
                                    <button
                                      className="btn primary"
                                      title={'Asignar turno de entrevista'}
                                      onClick={() => programarTurnosEntrevista(row.candidatoRef, { replaceExisting: false })}
                                    >
                                      <MdEventAvailable size={18} />
                                      <span>Asignar turno</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {/* detalle expandido eliminado, ahora se muestra en modal */}
                          </>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Se removió la tabla antigua de candidatos; se mantiene solo la tabla nueva de entrevistas pendientes */}
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



