import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import axios from "axios";
import {
  MdGroups,
  MdChildCare,
  MdLocalHospital,
  MdEventAvailable,
  MdRefresh,
  MdSchedule,
} from "react-icons/md";
import useAuthStore from "../store/useAuthStore";
import "../styles/MainDashboard.css";
import API_BASE_URL from "../constants/api";
import { parseNinosResponse } from "../utils/ninoResponse";

const DATE_FULL_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "full",
});
const DATE_SHORT_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
});
const TIME_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
});

function formatDateParts(isoString) {
  if (!isoString) {
    return { date: "--", time: "" };
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return { date: "--", time: "" };
  }
  return {
    date: DATE_SHORT_FORMATTER.format(date),
    time: TIME_FORMATTER.format(date),
  };
}

function calculateAgeLabel(dateString) {
  if (!dateString) return null;
  const birth = new Date(dateString);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hasBirthdayPassed =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hasBirthdayPassed) {
    age -= 1;
  }
  if (age < 0) return null;
  if (age === 0) return "Menor de 1 año";
  return `${age} ${age === 1 ? "año" : "años"}`;
}

function getInitials(nombre, apellido) {
  const first = (nombre || "").trim().charAt(0);
  const last = (apellido || "").trim().charAt(0);
  const result = `${first}${last}`.toUpperCase();
  return result || "US";
}

function capitalize(word) {
  if (!word) return "—";
  const trimmed = String(word).trim();
  if (!trimmed) return "—";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function resolveArrayData(payload) {
  if (!payload) return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
  if (payload.data && Array.isArray(payload.data.data)) {
    return payload.data.data;
  }
  return [];
}

function resolveTotalCount(payload, fallbackLength = 0) {
  if (!payload || typeof payload !== "object") return fallbackLength;
  if (typeof payload.total === "number") return payload.total;
  if (typeof payload.count === "number") return payload.count;
  if (typeof payload.data?.total === "number") return payload.data.total;
  return fallbackLength;
}

export default function MainDashboard() {
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);
  const needsProfile = useAuthStore((state) => state.needsProfile);

  const isAdmin = user?.es_admin || (user?.roles?.some(role => role.nombre?.toLowerCase() === 'admin'));
  const isProfesional = user?.roles?.some(role => role.nombre?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === 'profesional');
  const isRecepcion = user?.roles?.some(role => role.nombre?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === 'recepcion');
  console.log('isAdmin:', isAdmin, 'isProfesional:', isProfesional, 'isRecepcion:', isRecepcion, 'user:', user, 'profile:', profile);

  const [summary, setSummary] = useState({
    professionals: 0,
    children: 0,
    obras: 0,
    turnosPendientes: 0,
    ...((isAdmin || isProfesional) ? { entrevistasPendientes: 0 } : {}),
  });
  const [latestProfessionals, setLatestProfessionals] = useState([]);
  const [latestChildren, setLatestChildren] = useState([]);
  const [upcomingTurnos, setUpcomingTurnos] = useState([]);
  const [latestEntrevistas, setLatestEntrevistas] = useState([]);
  const [profesionesMap, setProfesionesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  const displayName = useMemo(() => {
    const full = [profile?.nombre, profile?.apellido]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (full) return full;
    if (user?.dni) return `Usuario ${user.dni}`;
    return "Profesional";
  }, [profile?.nombre, profile?.apellido, user?.dni]);

  const todayLabel = useMemo(() => DATE_FULL_FORMATTER.format(new Date()), []);

  const loadDashboard = useCallback(async (initialLoad = false) => {
    if (initialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      const promises = [
        axios.get(`${API_BASE_URL}/api/equipo`, {
          params: { page: 1, pageSize: 4, activo: true },
        }),
        axios.get(`${API_BASE_URL}/api/ninos`, {
          params: { page: 1, pageSize: 4 },
        }),
        axios.get(`${API_BASE_URL}/api/obras-sociales`, {
          params: { page: 1, pageSize: 4 },
        }),
        axios.get(`${API_BASE_URL}/api/turnos`, {
          params: { estado: "pendiente", limit: 8 },
        }),
        axios.get(`${API_BASE_URL}/api/profesiones`),
        ...((isAdmin || isProfesional) ? [axios.get(`${API_BASE_URL}/api/turnos`, {
          params: { estado: "pendiente", citacion: "Entrevista", ...(profile?.profesion_id ? { departamentoId: profile.profesion_id } : {}), limit: 8 },
        })] : []),
      ];

      console.log('departamentoId:', profile?.profesion_id, 'isAdmin:', isAdmin, 'isProfesional:', isProfesional, 'isRecepcion:', isRecepcion);

      const results = await Promise.allSettled(promises);

      const equipoResult = results[0];
      const ninosResult = results[1];
      const obrasResult = results[2];
      const turnosResult = results[3];
      const profesionesResult = results[4];
      const entrevistaResult = (isAdmin || isProfesional) ? results[5] : null;

      if (!activeRef.current) return;

      const errors = [];

      let profesionalesListado = [];
      let professionalsTotal = 0;
      if (equipoResult.status === "fulfilled") {
        const payload = equipoResult.value?.data ?? {};
        profesionalesListado = resolveArrayData(payload);
        professionalsTotal = resolveTotalCount(
          payload,
          profesionalesListado.length
        );
      } else {
        errors.push("equipo");
      }

      let ninosListado = [];
      let childrenTotal = 0;
      if (ninosResult.status === "fulfilled") {
        const parsed = parseNinosResponse(ninosResult.value?.data);
        ninosListado = parsed.list;
        childrenTotal = parsed.total;
      } else {
        errors.push("niños");
      }

      let obrasListado = [];
      let obrasTotal = 0;
      if (obrasResult.status === "fulfilled") {
        const payload = obrasResult.value?.data ?? {};
        obrasListado = resolveArrayData(payload);
        obrasTotal = resolveTotalCount(payload, obrasListado.length);
      } else {
        errors.push("obras sociales");
      }

      let turnosListado = [];
      let turnosTotal = 0;
      if (turnosResult.status === "fulfilled") {
        const payload = turnosResult.value?.data ?? {};
        turnosListado = resolveArrayData(payload);
        turnosTotal = resolveTotalCount(payload, turnosListado.length);
      } else {
        errors.push("turnos");
      }

      let profesionesListado = [];
      if (profesionesResult.status === "fulfilled") {
        const payload = profesionesResult.value?.data ?? {};
        profesionesListado = resolveArrayData(payload);
      } else {
        errors.push("profesiones");
      }

      let entrevistasListado = [];
      let entrevistasTotal = 0;
      if ((isAdmin || isProfesional) && entrevistaResult && entrevistaResult.status === "fulfilled") {
        const payload = entrevistaResult.value?.data ?? {};
        entrevistasListado = resolveArrayData(payload);
        entrevistasTotal = resolveTotalCount(payload, entrevistasListado.length);
      } else if (isAdmin || isProfesional) {
        errors.push("entrevistas");
      }

      const profesionesDictionary = profesionesListado.reduce(
        (acc, profesion) => {
          if (profesion?.id_departamento) {
            acc[profesion.id_departamento] = profesion.nombre;
          }
          return acc;
        },
        {}
      );

      const upcoming = turnosListado
        .filter((turno) => {
          if (!turno?.inicio) return false;
          const start = new Date(turno.inicio);
          if (Number.isNaN(start.getTime())) return false;
          return start.getTime() >= Date.now();
        })
        .slice(0, 5);

      const upcomingEntrevistas = entrevistasListado
        .slice(0, 5);

      if (activeRef.current) {
        setProfesionesMap(profesionesDictionary);
        setSummary({
          professionals: professionalsTotal,
          children: childrenTotal,
          obras: obrasTotal,
          turnosPendientes: turnosTotal,
          ...((isAdmin || isProfesional) ? { entrevistasPendientes: entrevistasTotal } : {}),
        });
        setLatestProfessionals(profesionalesListado.slice(0, 4));
        setLatestChildren(ninosListado.slice(0, 4));
        setUpcomingTurnos(upcoming);
        if (isAdmin || isProfesional) setLatestEntrevistas(upcomingEntrevistas);
        setError(
          errors.length
            ? `No se pudieron cargar algunos datos (${errors.join(", ")}).`
            : null
        );
      }
    } catch (err) {
      if (activeRef.current) {
        console.error("MainDashboard load error", err);
        setError(
          "No se pudieron cargar los datos del dashboard. Intentá nuevamente."
        );
      }
    } finally {
      if (activeRef.current) {
        if (initialLoad) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    }
  }, []);

  useEffect(() => {
    loadDashboard(true);
  }, [loadDashboard]);

  const cards = useMemo(
    () => [
      ...(isAdmin ? [{
        id: "professionals",
        label: "Profesionales activos",
        value: summary.professionals,
        icon: <MdGroups size={24} />,
        to: "/dashboard/profesionales",
        hint: `${latestProfessionals.length} recientes`,
      }] : []),
      {
        id: "children",
        label: "Niños registrados",
        value: summary.children,
        icon: <MdChildCare size={24} />,
        to: "/dashboard/ninos",
        hint: `${latestChildren.length} ingresados`,
      },
      {
        id: "obras",
        label: "Obras sociales",
        value: summary.obras,
        icon: <MdLocalHospital size={24} />,
        to: "/dashboard/obras-sociales",
        hint: "Catálogo actualizado",
      },
      {
        id: "turnos",
        label: "Turnos pendientes",
        value: summary.turnosPendientes,
        icon: <MdEventAvailable size={24} />,
        to: "/dashboard/turnos",
        hint: `${upcomingTurnos.length} próximos`,
      },
      ...((isAdmin || isProfesional) ? [{
        id: "entrevistas",
        label: "Entrevistas pendientes",
        value: summary.entrevistasPendientes,
        icon: <MdSchedule size={24} />,
        to: "/dashboard/entrevistas",
        hint: `${latestEntrevistas.length} próximas`,
      }] : []),
    ],
    [
      summary.professionals,
      latestProfessionals.length,
      summary.children,
      latestChildren.length,
      summary.obras,
      summary.turnosPendientes,
      upcomingTurnos.length,
      summary.entrevistasPendientes,
      latestEntrevistas.length,
    ]
  );

  return (
    <section className="main-dashboard">
      <header className="main-dashboard__header">
        <div>
          <p className="main-dashboard__greeting">Hola, {displayName}</p>
          <h1 className="main-dashboard__title">Panel principal</h1>
          <p className="main-dashboard__subtitle">{todayLabel}</p>
        </div>
        <div className="main-dashboard__actions">
          <button
            type="button"
            className="main-dashboard__refresh"
            onClick={() => loadDashboard(false)}
            disabled={refreshing || loading}
          >
            <span>{refreshing ? "Actualizando..." : "Actualizar"}</span>
            <MdRefresh className={refreshing ? "is-rotating" : ""} size={18} />
          </button>
        </div>
      </header>

      {needsProfile && (
        <div className="main-dashboard__alert main-dashboard__alert--warning">
          <div>
            <strong>Termina de configurar tu perfil.</strong> Esto asegura que
            el equipo pueda encontrarte fácilmente.
          </div>
          <NavLink to="/dashboard/editar-profesional">Completar ahora</NavLink>
        </div>
      )}

      {error && (
        <div className="main-dashboard__alert main-dashboard__alert--error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="main-dashboard__loading">
          <span className="main-dashboard__spinner" aria-hidden="true" />
          <span>Cargando información...</span>
        </div>
      ) : (
        <>
          <div className="main-dashboard__stats">
            {cards.map((card, index) => (
              <NavLink
                key={card.id}
                to={card.to}
                className={`stat-card stat-card--${index}`}
              >
                <div className="stat-card__icon">{card.icon}</div>
                <div className="stat-card__meta">
                  <span className="stat-card__label">{card.label}</span>
                  <span className="stat-card__value">{card.value}</span>
                </div>
                <span className="stat-card__hint">{card.hint}</span>
              </NavLink>
            ))}
          </div>

          <div className="main-dashboard__panels">
            <section className="main-dashboard__panel">
              <div className="main-dashboard__panel-header">
                <h2>Próximos turnos</h2>
                <NavLink to="/dashboard/turnos">Ver todos</NavLink>
              </div>
              {upcomingTurnos.length === 0 ? (
                <p className="main-dashboard__empty">
                  No hay turnos próximos registrados.
                </p>
              ) : (
                <ul className="main-dashboard__turnos">
                  {upcomingTurnos.map((turno) => {
                    const { date, time } = formatDateParts(turno.inicio);
                    const area =
                      turno?.departamento_id &&
                      profesionesMap[turno.departamento_id]
                        ? profesionesMap[turno.departamento_id]
                        : turno?.departamento_id
                        ? `Área ${turno.departamento_id}`
                        : "Sin área";
                    return (
                      <li key={turno.id} className="main-dashboard__turno-item">
                        <div className="main-dashboard__turno-date">
                          <span className="main-dashboard__turno-day">
                            {date}
                          </span>
                          <span className="main-dashboard__turno-time">
                            {time}
                          </span>
                        </div>
                        <div className="main-dashboard__turno-info">
                          <p className="main-dashboard__turno-area">{area}</p>
                          <p className="main-dashboard__turno-meta">
                            {turno.nino_id ? "Asignado" : "Disponible"}
                            {" - "}
                            {capitalize(turno.estado)}
                            {turno.consultorio_id && (
                              <span>
                                {" - "}Consultorio {turno.consultorio_id}
                              </span>
                            )}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {isAdmin && (
              <section className="main-dashboard__panel main-dashboard__panel--wide">
                <div className="main-dashboard__panel-header">
                  <h2>Entrevistas pendientes</h2>
                  <NavLink to="/dashboard/entrevistas">Ver todas</NavLink>
                </div>
                {latestEntrevistas.length === 0 ? (
                  <p className="main-dashboard__empty">
                    No hay entrevistas pendientes.
                  </p>
                ) : (
                  <ul className="main-dashboard__turnos">
                    {latestEntrevistas.map((entrevista) => {
                      const { date, time } = formatDateParts(entrevista.inicio);
                      const area =
                        entrevista?.departamento_id &&
                        profesionesMap[entrevista.departamento_id]
                          ? profesionesMap[entrevista.departamento_id]
                          : entrevista?.departamento_id
                          ? `Área ${entrevista.departamento_id}`
                          : "Sin área";
                      return (
                        <li key={entrevista.id} className="main-dashboard__turno-item">
                          <div className="main-dashboard__turno-date">
                            <span className="main-dashboard__turno-day">
                              {date}
                            </span>
                            <span className="main-dashboard__turno-time">
                              {time}
                            </span>
                          </div>
                          <div className="main-dashboard__turno-info">
                            <p className="main-dashboard__turno-area">{area}</p>
                            <p className="main-dashboard__turno-meta">
                              {entrevista.nino_id ? "Asignado" : "Disponible"}
                              {" - "}
                              {capitalize(entrevista.estado)}
                              {entrevista.consultorio_id && (
                                <span>
                                  {" - "}Consultorio {entrevista.consultorio_id}
                                </span>
                              )}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}

            <section className="main-dashboard__panel">
              <div className="main-dashboard__panel-header">
                <h2>Niños y candidatos recientes</h2>
                <NavLink to="/dashboard/ninos">Gestionar</NavLink>
              </div>
              {latestChildren.length === 0 ? (
                <p className="main-dashboard__empty">
                  Aún no hay niños registrados.
                </p>
              ) : (
                <ul className="main-dashboard__list">
                  {latestChildren.map((nino) => (
                    <li key={nino.id_nino}>
                      <div className="main-dashboard__list-item">
                        <div className="main-dashboard__avatar main-dashboard__avatar--muted">
                          {getInitials(nino.nombre, nino.apellido)}
                        </div>
                        <div className="main-dashboard__list-info">
                          <p className="main-dashboard__list-title">
                            {[nino.nombre, nino.apellido]
                              .filter(Boolean)
                              .join(" ") || "Sin nombre"}
                          </p>
                          <p className="main-dashboard__list-subtitle">
                            {capitalize(nino.tipo)}
                          </p>
                        </div>
                        <div className="main-dashboard__list-meta">
                          {nino.fecha_nacimiento && (
                            <span>
                              {calculateAgeLabel(nino.fecha_nacimiento)}
                            </span>
                          )}
                          {nino.dni && <span>DNI {nino.dni}</span>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
