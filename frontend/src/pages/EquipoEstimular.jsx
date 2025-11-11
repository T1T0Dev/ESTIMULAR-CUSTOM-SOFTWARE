import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  MdEdit,
  MdDelete,
  MdGroupAdd,
  MdCheck,
  MdClose,
  MdLockReset,
} from "react-icons/md";
import "../styles/NinosPage.css";
import "../styles/EquipoEstimular.css";
import CrearIntegrante from "../components/CrearIntegrante";
import ReestablecerContraseña from "../components/ReestablecerContraseña";
import useAuthStore from "../store/useAuthStore";
import API_BASE_URL from "../constants/api";

// Custom hook to debounce a value (defined at module scope to follow Rules of Hooks)
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function formatDateDMY(dateStr) {
  if (!dateStr) return "";
  const normalized = String(dateStr).slice(0, 10);
  const [yyyy, mm, dd] = normalized.split("-");
  if (!yyyy || !mm || !dd) return "";
  return `${dd.padStart(2, "0")}/${mm.padStart(2, "0")}/${yyyy}`;
}

const toTitleCase = (value) =>
  value
    ? String(value)
        .split(/\s+/)
        .filter(Boolean)
        .map(
          (word) =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ")
    : "";

function formatRole(member) {
  const raw = (member?.rol_principal || member?.profesion || "").trim();
  const tipo = String(member?.tipo || "").toLowerCase();
  const normalized = raw.toLowerCase();
  if (!raw) {
    if (["recepcion", "recepción", "secretario", "secretaria"].includes(tipo)) {
      return "Recepción";
    }
    return "Profesional";
  }
  if (
    normalized.includes("recepcion") ||
    normalized.includes("recepción") ||
    normalized.includes("secretar")
  ) {
    return "Recepción";
  }
  return toTitleCase(raw);
}

export default function EquipoEstimular() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [profesionFiltro, setProfesionFiltro] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [profesiones, setProfesiones] = useState([]);

  const debouncedBusqueda = useDebounce(busqueda, 300);
  const skipPageEffectRef = useRef(false);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await axios.get(
          `${API_BASE_URL}/api/profesiones`
        );
        if (!active) return;
        const listado = Array.isArray(data?.data) ? data.data : [];
        setProfesiones(listado);
      } catch (err) {
        console.error("Error al obtener profesiones:", err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const departamentoOptions = useMemo(() => {
    const map = new Map();
    (Array.isArray(profesiones) ? profesiones : []).forEach((item) => {
      const rawId =
        item?.id_departamento ?? item?.departamento_id ?? item?.id ?? null;
      const parsedId = Number.parseInt(rawId, 10);
      const nombre = (item?.nombre || "").trim();
      if (!nombre || Number.isNaN(parsedId) || map.has(parsedId)) return;
      map.set(parsedId, { id: parsedId, label: nombre, raw: item });
    });
    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "es")
    );
  }, [profesiones]);

  const departamentoMap = useMemo(() => {
    const map = new Map();
    departamentoOptions.forEach((opt) => {
      map.set(opt.id, opt);
    });
    return map;
  }, [departamentoOptions]);

  const filtroOptions = useMemo(() => {
    const base = [
      { value: "all", label: "Todos los departamentos" },
      ...departamentoOptions.map((opt) => ({
        value: `dept:${opt.id}`,
        label: opt.label,
      })),
    ];
    base.push({ value: "recepcion", label: "Recepción" });
    return base;
  }, [departamentoOptions]);

  const isAdmin = useMemo(() => {
    if (profile?.es_admin || user?.es_admin) {
      return true;
    }
    const names = [];
    if (user?.rol_nombre) names.push(user.rol_nombre);
    if (Array.isArray(user?.roles)) {
      names.push(
        ...user.roles
          .map((r) => r?.nombre)
          .filter((value) => typeof value === "string")
      );
    }
    return names
      .map((value) => value.toLowerCase())
      .some((value) => value.includes("admin") || value.includes("administr"));
  }, [profile?.es_admin, user?.es_admin, user?.rol_nombre, user?.roles]);

  const handleOpenReset = useCallback((member) => {
    if (!member?.id_usuario) return;
    setResetTarget(member);
    setResetModalOpen(true);
  }, []);

  const handleCloseReset = useCallback(() => {
    setResetModalOpen(false);
    setResetTarget(null);
  }, []);

  const fetchEquipo = useCallback(
    async (search = "", pageNum = 1, filtroSel = "all") => {
      setLoading(true);
      try {
        const params = {
          search,
          page: pageNum,
          pageSize,
          activo: true,
        };
        const normalizedFiltro = String(filtroSel).toLowerCase();
        let tipoValue = "todos";
        if (
          normalizedFiltro === "recepcion" ||
          normalizedFiltro === "recepción" ||
          normalizedFiltro === "secretario" ||
          normalizedFiltro === "secretaria"
        ) {
          tipoValue = "recepcion";
        } else if (
          typeof filtroSel === "string" &&
          filtroSel.startsWith("dept:")
        ) {
          tipoValue = "profesional";
          const [, rawId] = filtroSel.split(":");
          const parsedId = Number.parseInt(rawId, 10);
          if (!Number.isNaN(parsedId)) {
            params.departamentoId = parsedId;
          }
        }
        params.tipo = tipoValue;
  const { data } = await axios.get(`${API_BASE_URL}/api/equipo`, {
          params,
        });
        setItems(data?.data || []);
        setTotal(data?.total || 0);
        setError(null);
      } catch (err) {
        console.error("Error al obtener equipo:", err);
        setError("Error al obtener equipo");
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  useEffect(() => {
    skipPageEffectRef.current = true;
    setPage(1);
    fetchEquipo(debouncedBusqueda, 1, profesionFiltro);
  }, [debouncedBusqueda, profesionFiltro, fetchEquipo]);

  useEffect(() => {
    if (skipPageEffectRef.current) {
      skipPageEffectRef.current = false;
      return;
    }
    fetchEquipo(busqueda, page, profesionFiltro);
  }, [page, busqueda, profesionFiltro, fetchEquipo]);

  const totalPages = useMemo(() => {
    if (!total) return 0;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);

  return (
    <section className="ninos-page">
      <div className="ninos-top">
        <h1 className="ninos-title">Equipo Estimular</h1>
        <div className="ninos-controls">
          <form
            className="busqueda-form"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              fetchEquipo(busqueda, 1, profesionFiltro);
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
                placeholder="Buscar por nombre, apellido, email o DNI"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </form>
          <div className="action-buttons">
            <select
              value={profesionFiltro}
              onChange={(e) => {
                setProfesionFiltro(e.target.value);
                setPage(1);
              }}
              className="btn outline-pink"
              title="Filtrar por departamento o recepción"
            >
              {filtroOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button className="btn primary" onClick={() => setModalOpen(true)}>
              <MdGroupAdd /> Nuevo integrante
            </button>
          </div>
        </div>
      </div>

      <div className="card ninos-card">
        {loading ? (
          <div className="loader">Cargando…</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : items.length === 0 ? (
          <div className="empty">No hay integrantes.</div>
        ) : (
          <>
            <div className="table-tools">
              <div className="left">
                <div className="meta">{total} registros</div>
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
                aria-label="Equipo Estimular"
              >
                <thead>
                  <tr>
                    <th>Foto</th>
                    <th>Nombre</th>
                    <th>DNI</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th>Nacimiento</th>
                    <th className="col-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => {
                    const tipoNormalized = String(p.tipo || "").toLowerCase();
                    const rowKey =
                      p.id_profesional ??
                      p.id_recepcion ??
                      p.id_secretario ??
                      p.id_usuario ??
                      `${tipoNormalized}-${p.dni ?? ""}-${p.nombre ?? ""}`;
                    const isProfesional = tipoNormalized === "profesional";
                    const memberKey =
                      p.id_usuario ??
                      p.id_profesional ??
                      p.id_recepcion ??
                      p.id_secretario ??
                      rowKey;
                    const canEdit = isAdmin;
                    const isEditing = canEdit && editId === memberKey;
                    const nombreCompleto = `${p.nombre || ""} ${
                      p.apellido || ""
                    }`.trim();
                    const fechaValue = p.fecha_nacimiento
                      ? String(p.fecha_nacimiento).slice(0, 10)
                      : "";
                    const selectedDepartamentoId = isEditing
                      ? editData.profesionId ??
                        editData.profesion_id ??
                        p.profesion_id ??
                        null
                      : p.profesion_id ?? null;
                    const departamentoLabel = (() => {
                      const idCandidates = [
                        p.profesion_id,
                        p.id_departamento,
                        p.departamento_id,
                      ];
                      for (const candidate of idCandidates) {
                        if (candidate === null || candidate === undefined) {
                          continue;
                        }
                        const parsed = Number.parseInt(candidate, 10);
                        if (Number.isNaN(parsed)) continue;
                        const found = departamentoMap.get(parsed)?.label;
                        if (found) return toTitleCase(found);
                      }
                      const textFallback = [
                        p.departamento_nombre,
                        p.nombre_departamento,
                        p.profesion_nombre,
                        p.profesion,
                      ].find((value) =>
                        value && String(value).trim().length > 0
                      );
                      return textFallback ? toTitleCase(textFallback) : null;
                    })();
                    const roleDisplay = departamentoLabel || formatRole(p);
                    const endpointId =
                      p.id_usuario ??
                      p.id_profesional ??
                      p.id_recepcion ??
                      p.id_secretario ??
                      null;
                    const fotoSrc = p.foto_perfil_url || p.foto_perfil || null;

                    return (
                      <tr key={rowKey}>
                        <td>
                          <div className="equipo-avatar">
                            {fotoSrc ? (
                              <img
                                src={fotoSrc}
                                loading="lazy"
                                alt={nombreCompleto || "Foto de perfil"}
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  const next = e.currentTarget.nextSibling;
                                  if (next) next.style.display = "grid";
                                }}
                              />
                            ) : null}
                            <div
                              className="equipo-avatar-fallback"
                              style={{
                                display: fotoSrc ? "none" : "grid",
                              }}
                            >
                              {`${(p.nombre?.[0] || "").toUpperCase()}${(
                                p.apellido?.[0] || ""
                              ).toUpperCase()}` || "U"}
                            </div>
                          </div>
                        </td>
                        <td>
                          {isEditing ? (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                              }}
                            >
                              <div style={{ display: "flex", gap: 8 }}>
                                <input
                                  className="edit-input"
                                  placeholder="Nombre"
                                  value={editData.nombre ?? p.nombre ?? ""}
                                  onChange={(e) =>
                                    setEditData((ed) => ({
                                      ...ed,
                                      nombre: e.target.value,
                                    }))
                                  }
                                />
                                <input
                                  className="edit-input"
                                  placeholder="Apellido"
                                  value={editData.apellido ?? p.apellido ?? ""}
                                  onChange={(e) =>
                                    setEditData((ed) => ({
                                      ...ed,
                                      apellido: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              {isProfesional ? (
                                <select
                                  className="edit-select"
                                  value={
                                    selectedDepartamentoId !== null &&
                                    selectedDepartamentoId !== undefined
                                      ? String(selectedDepartamentoId)
                                      : ""
                                  }
                                  onChange={(e) => {
                                    const nextValue = e.target.value;
                                    setEditData((ed) => ({
                                      ...ed,
                                      profesionId: nextValue
                                        ? Number.parseInt(nextValue, 10)
                                        : null,
                                    }));
                                  }}
                                >
                                  <option value="">— Seleccionar —</option>
                                  {departamentoOptions.map((opt) => (
                                    <option key={opt.id} value={opt.id}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              ) : null}
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                              }}
                            >
                              <span>
                                {roleDisplay
                                  ? `${nombreCompleto || "—"} / ${roleDisplay}`
                                  : nombreCompleto || "—"}
                              </span>
                            </div>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              className="edit-input"
                              value={editData.usuario?.dni ?? p.dni ?? ""}
                              onChange={(e) =>
                                setEditData((ed) => ({
                                  ...ed,
                                  usuario: {
                                    ...(ed.usuario || {}),
                                    dni: e.target.value,
                                  },
                                }))
                              }
                            />
                          ) : (
                            p.dni || "—"
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              className="edit-input"
                              value={editData.email ?? p.email ?? ""}
                              onChange={(e) =>
                                setEditData((ed) => ({
                                  ...ed,
                                  email: e.target.value,
                                }))
                              }
                            />
                          ) : (
                            p.email || "—"
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              className="edit-input"
                              value={editData.telefono ?? p.telefono ?? ""}
                              onChange={(e) =>
                                setEditData((ed) => ({
                                  ...ed,
                                  telefono: e.target.value,
                                }))
                              }
                            />
                          ) : (
                            p.telefono || "—"
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="date"
                              className="edit-input"
                              value={
                                editData.fecha_nacimiento !== undefined
                                  ? editData.fecha_nacimiento
                                  : fechaValue
                              }
                              onChange={(e) =>
                                setEditData((ed) => ({
                                  ...ed,
                                  fecha_nacimiento: e.target.value,
                                }))
                              }
                            />
                          ) : fechaValue ? (
                            formatDateDMY(fechaValue)
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="col-actions">
                          <div className="row-actions">
                            {isEditing ? (
                              <>
                                <button
                                  className="icon-btn save"
                                  title="Guardar"
                                  onClick={async () => {
                                    try {
                                      const payload = {};
                                      const baseFields = [
                                        "nombre",
                                        "apellido",
                                        "fecha_nacimiento",
                                        "telefono",
                                        "email",
                                      ];
                                      baseFields.forEach((k) => {
                                        if (editData[k] === undefined) return;
                                        const originalValue =
                                          p[k] !== undefined ? p[k] : null;
                                        if (editData[k] !== originalValue) {
                                          payload[k] = editData[k];
                                        }
                                      });

                                      if (isProfesional) {
                                        const currentDepIdRaw =
                                          p.profesion_id ??
                                          p.id_departamento ??
                                          null;
                                        const currentDepId =
                                          currentDepIdRaw !== null &&
                                          currentDepIdRaw !== undefined
                                            ? Number(currentDepIdRaw)
                                            : null;
                                        const nextDepIdRaw =
                                          editData.profesionId ??
                                          editData.profesion_id ??
                                          null;
                                        if (nextDepIdRaw !== undefined) {
                                          const nextDepId =
                                            Number(nextDepIdRaw);
                                          if (
                                            !Number.isNaN(nextDepId) &&
                                            nextDepId !== currentDepId
                                          ) {
                                            payload.profesionId = nextDepId;
                                          }
                                        }
                                      }

                                      if (editData.usuario) {
                                        const usuarioPayload = {};
                                        if (
                                          editData.usuario.dni !== undefined &&
                                          editData.usuario.dni !== p.dni
                                        ) {
                                          usuarioPayload.dni =
                                            editData.usuario.dni;
                                        }
                                        if (editData.usuario.contrasena) {
                                          usuarioPayload.contrasena =
                                            editData.usuario.contrasena;
                                        }
                                        if (
                                          editData.usuario.activo !==
                                            undefined &&
                                          editData.usuario.activo !==
                                            p.usuario_activo
                                        ) {
                                          usuarioPayload.activo =
                                            editData.usuario.activo;
                                        }
                                        if (
                                          Object.keys(usuarioPayload).length > 0
                                        ) {
                                          payload.usuario = usuarioPayload;
                                        }
                                      }

                                      if (Object.keys(payload).length === 0) {
                                        setEditId(null);
                                        setEditData({});
                                        return;
                                      }

                                      if (!endpointId) {
                                        throw new Error(
                                          "No se encontró identificador del integrante"
                                        );
                                      }

                                      const tipoForUpdate = String(
                                        p.tipo || ""
                                      ).toLowerCase();
                                      const url =
                                        tipoForUpdate === "recepcion" ||
                                        tipoForUpdate === "secretario"
                                          ? `${API_BASE_URL}/api/equipo/recepcion/${endpointId}`
                                          : `${API_BASE_URL}/api/equipo/${endpointId}`;
                                      Swal.fire({
                                        title: "Guardando...",
                                        allowOutsideClick: false,
                                        didOpen: () => Swal.showLoading(),
                                      });
                                      await axios.put(url, payload);
                                      setEditId(null);
                                      setEditData({});
                                      await fetchEquipo(
                                        busqueda,
                                        page,
                                        profesionFiltro
                                      );
                                      Swal.close();
                                      Swal.fire({
                                        icon: "success",
                                        title: "Guardado",
                                        timer: 1100,
                                        showConfirmButton: false,
                                      });
                                    } catch (err) {
                                      Swal.close();
                                      Swal.fire({
                                        icon: "error",
                                        title: "Error",
                                        text:
                                          err?.response?.data?.message ||
                                          "No se pudo guardar",
                                      });
                                    }
                                  }}
                                >
                                  <MdCheck size={18} />
                                </button>
                                <button
                                  className="icon-btn cancel"
                                  title="Cancelar"
                                  onClick={() => {
                                    setEditId(null);
                                    setEditData({});
                                  }}
                                >
                                  <MdClose size={18} />
                                </button>
                              </>
                            ) : canEdit ? (
                              <>
                                <button
                                  className="icon-btn edit"
                                  title="Editar"
                                  onClick={() => {
                                    setEditId(memberKey);
                                    setEditData({
                                      nombre: p.nombre ?? "",
                                      apellido: p.apellido ?? "",
                                      fecha_nacimiento: fechaValue,
                                      profesionId:
                                        p.profesion_id ??
                                        p.id_departamento ??
                                        null,
                                      email: p.email ?? "",
                                      telefono: p.telefono ?? "",
                                      usuario: { dni: p.dni },
                                      tipo: p.tipo,
                                    });
                                  }}
                                >
                                  <MdEdit size={20} />
                                </button>
                                <button
                                  className="icon-btn delete"
                                  title="Eliminar"
                                  onClick={async () => {
                                    if (!endpointId) {
                                      Swal.fire({
                                        icon: "error",
                                        title: "Error",
                                        text: "No se encontró el identificador del integrante",
                                      });
                                      return;
                                    }
                                    const conf = await Swal.fire({
                                      title: "¿Eliminar?",
                                      text: "Se realizará borrado lógico",
                                      icon: "warning",
                                      showCancelButton: true,
                                      confirmButtonText: "Sí, eliminar",
                                      cancelButtonText: "Cancelar",
                                    });
                                    if (!conf.isConfirmed) return;
                                    try {
                                      Swal.fire({
                                        title: "Eliminando...",
                                        allowOutsideClick: false,
                                        didOpen: () => Swal.showLoading(),
                                      });
                                      await axios.delete(
                                        `${API_BASE_URL}/api/equipo/${endpointId}`
                                      );
                                      await fetchEquipo(
                                        busqueda,
                                        page,
                                        profesionFiltro
                                      );
                                      Swal.close();
                                      Swal.fire({
                                        icon: "success",
                                        title: "Eliminado",
                                        timer: 1100,
                                        showConfirmButton: false,
                                      });
                                    } catch (err) {
                                      Swal.close();
                                      Swal.fire({
                                        icon: "error",
                                        title: "Error",
                                        text:
                                          err?.response?.data?.message ||
                                          "No se pudo eliminar",
                                      });
                                    }
                                  }}
                                >
                                  <MdDelete size={20} />
                                </button>
                              </>
                            ) : (
                              <span className="meta muted">Solo lectura</span>
                            )}
                            {!isEditing && isAdmin && p.id_usuario ? (
                              <button
                                className="icon-btn reset"
                                title="Restablecer contraseña"
                                onClick={() => handleOpenReset(p)}
                              >
                                <MdLockReset size={18} />
                              </button>
                            ) : null}
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
        <CrearIntegrante
          onClose={() => setModalOpen(false)}
          onCreated={async () => {
            setModalOpen(false);
            await fetchEquipo(busqueda, page, profesionFiltro);
          }}
        />
      )}
      {resetModalOpen && (
        <ReestablecerContraseña
          open={resetModalOpen}
          miembro={resetTarget}
          onClose={handleCloseReset}
        />
      )}
    </section>
  );
}
