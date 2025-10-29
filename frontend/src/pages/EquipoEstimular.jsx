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

const DEFAULT_ROLES = [
  "psicologa",
  "psicólogo",
  "psicologa infantil",
  "fonoaudiologa",
  "fonoaudióloga",
  "psicomotricista",
  "terapeuta ocupacional",
  "recepcionista",
  "secretario/a",
];

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
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return "";
  const dd = String(parsed.getDate()).padStart(2, "0");
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const yyyy = parsed.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function calculateAge(dateStr) {
  if (!dateStr) return null;
  const birth = new Date(dateStr);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function formatRole(member) {
  const raw = (member?.rol_principal || member?.profesion || "").trim();
  const normalized = raw.toLowerCase();
  if (!raw) {
    return member?.tipo === "secretario" ? "Secretario/a" : "Profesional";
  }
  if (normalized.includes("secret")) {
    return "Secretario/a";
  }
  return raw
    .split(" ")
    .map((word) =>
      word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word
    )
    .join(" ");
}

export default function EquipoEstimular() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [profesionFiltro, setProfesionFiltro] = useState("todas");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);

  const debouncedBusqueda = useDebounce(busqueda, 300);
  const skipPageEffectRef = useRef(false);
  const user = useAuthStore((s) => s.user);

  const roleOptions = useMemo(() => {
    const map = new Map();
    const registerRole = (rawRole, tipo) => {
      if (!rawRole) return;
      const normalized = rawRole.toLowerCase();
      if (map.has(normalized)) return;
      map.set(normalized, {
        value: normalized,
        raw: rawRole,
        label: formatRole({ rol_principal: rawRole, tipo }),
      });
    };

    DEFAULT_ROLES.forEach((value) =>
      registerRole(
        value,
        value.toLowerCase().includes("secret") ? "secretario" : "profesional"
      )
    );

    items.forEach((item) => {
      const rawRole =
        (
          item.rol_principal ||
          item.profesion ||
          (item.tipo === "secretario" ? "secretario/a" : "")
        )?.trim() || "";
      if (!rawRole) return;
      registerRole(rawRole, item.tipo);
    });

    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "es")
    );
  }, [items]);

  const roleOptionMap = useMemo(() => {
    const map = {};
    roleOptions.forEach((opt) => {
      map[opt.value] = opt;
    });
    return map;
  }, [roleOptions]);

  const isAdmin = useMemo(() => {
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
  }, [user?.rol_nombre, user?.roles]);

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
    async (search = "", pageNum = 1, profesionSel = "todas") => {
      setLoading(true);
      try {
        const params = {
          search,
          page: pageNum,
          pageSize,
          activo: true,
          tipo: "todos",
        };
        if (profesionSel && profesionSel !== "todas") {
          params.profesion = profesionSel;
        }
        const { data } = await axios.get("http://localhost:5000/api/equipo", {
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
              title="Filtrar por rol/profesión"
            >
              <option value="todas">Todas las profesiones</option>
              {roleOptions.map((opt) => (
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
                    <th>Rol</th>
                    <th>Nombre</th>
                    <th>DNI</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th>Nacimiento / Edad</th>
                    <th className="col-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => {
                    const rowKey =
                      p.id_profesional ??
                      p.id_secretario ??
                      p.id_usuario ??
                      `${p.tipo}-${p.dni ?? ""}-${p.nombre ?? ""}`;
                    const isProfesional = p.tipo === "profesional";
                    const isEditing =
                      isProfesional && editId === p.id_profesional;
                    const nombreCompleto = `${p.nombre || ""} ${
                      p.apellido || ""
                    }`.trim();
                    const fechaValue = p.fecha_nacimiento
                      ? String(p.fecha_nacimiento).slice(0, 10)
                      : "";
                    const edad = calculateAge(fechaValue);
                    const roleLabel = formatRole(p);
                    const profesionValue = (
                      isEditing
                        ? editData.profesion ?? p.profesion ?? ""
                        : p.profesion ?? ""
                    ).toLowerCase();

                    return (
                      <tr key={rowKey}>
                        <td>
                          <div className="equipo-avatar">
                            {p.foto_perfil ? (
                              <img
                                src={p.foto_perfil}
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
                                display: p.foto_perfil ? "none" : "grid",
                              }}
                            >
                              {`${(p.nombre?.[0] || "").toUpperCase()}${(
                                p.apellido?.[0] || ""
                              ).toUpperCase()}` || "U"}
                            </div>
                          </div>
                        </td>
                        <td>
                          {isProfesional && isEditing ? (
                            <select
                              className="edit-select"
                              value={profesionValue}
                              onChange={(e) => {
                                const opt = roleOptionMap[e.target.value];
                                setEditData((ed) => ({
                                  ...ed,
                                  profesion: opt?.raw ?? "",
                                }));
                              }}
                            >
                              <option value="">— Seleccionar —</option>
                              {roleOptions
                                .filter((opt) => !opt.value.includes("secret"))
                                .map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                            </select>
                          ) : (
                            roleLabel
                          )}
                        </td>
                        <td>
                          {isEditing ? (
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
                          ) : (
                            nombreCompleto || "—"
                          )}
                        </td>
                        <td>
                          {isProfesional && isEditing ? (
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
                            `${formatDateDMY(fechaValue)}${
                              edad !== null ? ` (${edad} años)` : ""
                            }`
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
                                      const fields = [
                                        "nombre",
                                        "apellido",
                                        "fecha_nacimiento",
                                        "telefono",
                                        "email",
                                      ];
                                      if (isProfesional) {
                                        fields.push("profesion");
                                      }
                                      fields.forEach((k) => {
                                        if (
                                          editData[k] !== undefined &&
                                          editData[k] !== p[k]
                                        ) {
                                          if (
                                            k === "profesion" &&
                                            !editData[k]
                                          ) {
                                            return;
                                          }
                                          payload[k] = editData[k];
                                        }
                                      });
                                      if (editData.usuario) {
                                        payload.usuario = editData.usuario;
                                      }
                                      Swal.fire({
                                        title: "Guardando...",
                                        allowOutsideClick: false,
                                        didOpen: () => Swal.showLoading(),
                                      });
                                      await axios.put(
                                        `http://localhost:5000/api/equipo/${p.id_profesional}`,
                                        payload
                                      );
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
                            ) : isProfesional ? (
                              <>
                                <button
                                  className="icon-btn edit"
                                  title="Editar"
                                  onClick={() => {
                                    setEditId(p.id_profesional);
                                    setEditData({
                                      nombre: p.nombre ?? "",
                                      apellido: p.apellido ?? "",
                                      fecha_nacimiento: fechaValue,
                                      profesion: p.profesion ?? "",
                                      email: p.email ?? "",
                                      telefono: p.telefono ?? "",
                                      usuario: { dni: p.dni },
                                    });
                                  }}
                                >
                                  <MdEdit size={20} />
                                </button>
                                <button
                                  className="icon-btn delete"
                                  title="Eliminar"
                                  onClick={async () => {
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
                                        `http://localhost:5000/api/equipo/${p.id_profesional}`
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
