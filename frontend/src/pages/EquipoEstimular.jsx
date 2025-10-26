import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { MdEdit, MdDelete, MdGroupAdd, MdCheck, MdClose } from "react-icons/md";
import "../styles/NinosPage.css";
import "../styles/EquipoEstimular.css";
import CrearIntegrante from "../components/CrearIntegrante";

// Custom hook to debounce a value (defined at module scope to follow Rules of Hooks)
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
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

  const debouncedBusqueda = useDebounce(busqueda, 300);
  const skipPageEffectRef = useRef(false);

  const PROFESIONES = [
    "psicologa",
    "fonoaudiologa",
    "psicomotricista",
    "terapeuta ocupacional",
    "recepcionista",
  ];

  function formatDateDMY(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d)) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  const fetchEquipo = useCallback(
    async (search = "", pageNum = 1, profesionSel = "todas") => {
      setLoading(true);
      try {
        const params = { search, page: pageNum, pageSize, activo: true };
        if (profesionSel && profesionSel !== "todas") {
          params.profesion = profesionSel;
        }
        const res = await axios.get("http://localhost:5000/api/equipo", {
          params,
        });
        setItems(res?.data?.data || []);
        setTotal(res?.data?.total || 0);
        setError(null);
      } catch (e) {
        console.error("Error al obtener equipo:", e);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = useMemo(
    () => Math.ceil(total / pageSize),
    [total, pageSize]
  );

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
              title="Filtrar por profesión"
            >
              <option value="todas">Todas las profesiones</option>
              {PROFESIONES.map((p) => (
                <option key={p} value={p}>
                  {p}
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
                    <th>DNI</th>
                    <th>Profesión</th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th>Fecha nacimiento</th>
                    <th className="col-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => {
                    const isEditing = editId === p.id_profesional;
                    const nombreCompleto = `${p.nombre || ""} ${
                      p.apellido || ""
                    }`.trim();
                    return (
                      <tr key={p.id_profesional}>
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
                          {isEditing ? (
                            <input
                              className="edit-input"
                              value={
                                editData.usuario?.dni ?? p.usuario?.dni ?? ""
                              }
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
                            p.usuario?.dni || "—"
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <select
                              className="edit-select"
                              value={editData.profesion ?? p.profesion ?? ""}
                              onChange={(e) =>
                                setEditData((ed) => ({
                                  ...ed,
                                  profesion: e.target.value || null,
                                }))
                              }
                            >
                              <option value="">— Seleccionar —</option>
                              {PROFESIONES.map((op) => (
                                <option key={op} value={op}>
                                  {op}
                                </option>
                              ))}
                            </select>
                          ) : (
                            p.profesion || "—"
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
                                  : p.fecha_nacimiento
                                  ? String(p.fecha_nacimiento).slice(0, 10)
                                  : ""
                              }
                              onChange={(e) =>
                                setEditData((ed) => ({
                                  ...ed,
                                  fecha_nacimiento: e.target.value,
                                }))
                              }
                            />
                          ) : p.fecha_nacimiento ? (
                            formatDateDMY(p.fecha_nacimiento)
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
                                      [
                                        "nombre",
                                        "apellido",
                                        "fecha_nacimiento",
                                        "profesion",
                                        "telefono",
                                        "email",
                                      ].forEach((k) => {
                                        if (
                                          editData[k] !== undefined &&
                                          editData[k] !== p[k]
                                        )
                                          payload[k] = editData[k];
                                      });
                                      if (editData.usuario)
                                        payload.usuario = editData.usuario;
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
                            ) : (
                              <>
                                <button
                                  className="icon-btn edit"
                                  title="Editar"
                                  onClick={() => {
                                    setEditId(p.id_profesional);
                                    setEditData({
                                      nombre: p.nombre,
                                      apellido: p.apellido,
                                      fecha_nacimiento: p.fecha_nacimiento
                                        ? String(p.fecha_nacimiento).slice(
                                            0,
                                            10
                                          )
                                        : "",
                                      profesion: p.profesion ?? "",
                                      email: p.email,
                                      telefono: p.telefono,
                                      usuario: { dni: p.usuario?.dni },
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
        <CrearIntegrante
          onClose={() => setModalOpen(false)}
          onCreated={async () => {
            setModalOpen(false);
            await fetchEquipo(busqueda, page, profesionFiltro);
          }}
        />
      )}
    </section>
  );
}
