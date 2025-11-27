import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import "../styles/NinosPage.css";
import Swal from "sweetalert2";
import { MdEdit, MdDelete } from "react-icons/md";
import { FaCheck, FaTimes, FaInfoCircle } from "react-icons/fa";
import CrearObraSocial from "../components/CrearObraSocial";
import API_BASE_URL from "../constants/api";
import useAuthStore from "../store/useAuthStore";

const sanitizeNombreObra = (value) => {
  if (!value) return "";
  return String(value)
    .normalize("NFC")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
};

const canonicalNombreObra = (value) =>
  sanitizeNombreObra(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s/g, "");

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function ObrasSociales() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.es_admin || (user?.roles?.some(role => role.nombre?.toLowerCase() === 'admin'));

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("todos");
  const [estados, setEstados] = useState(["todos"]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const pageSize = 10;
  const skipPageEffectRef = useRef(false);

  const debouncedBusqueda = useDebounce(busqueda, 300);

  const fetchEstados = useCallback(async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/obras-sociales/estados`
      );
      const arr = res?.data?.data || [];
      setEstados(["todos", ...arr]);
    } catch (e) {
      console.error("Error cargando estados:", e);
    }
  }, []);

  const fetchObras = useCallback(
    async (search = "", pageNum = 1, estadoSel = "todos") => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/obras-sociales`,
          {
            params: { search, page: pageNum, pageSize, estado: estadoSel },
          }
        );
        const data = res.data.data || [];
        setItems(
          data.map((item) => ({
            ...item,
            nombre_obra_social: sanitizeNombreObra(item?.nombre_obra_social),
          }))
        );
        setTotal(res.data.total || 0);
        setError(null);
      } catch (e) {
        console.error("Error al obtener obras sociales:", e);
        setError("Error al obtener obras sociales");
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  useEffect(() => {
    fetchEstados();
  }, [fetchEstados]);

  useEffect(() => {
    skipPageEffectRef.current = true;
    setPage(1);
    fetchObras(debouncedBusqueda, 1, estado);
  }, [debouncedBusqueda, estado, fetchObras]);

  useEffect(() => {
    if (skipPageEffectRef.current) {
      skipPageEffectRef.current = false;
      return;
    }
    fetchObras(busqueda, page, estado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleBuscar = (e) => {
    e.preventDefault();
    setPage(1);
    fetchObras(busqueda, 1, estado);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <section className="ninos-page">
      <div className="ninos-top">
        <h1 className="ninos-title">Obras Sociales</h1>
        <div className="ninos-controls">
          <form
            className="busqueda-form"
            onSubmit={handleBuscar}
            role="search"
            aria-label="Buscar obras sociales"
          >
            <label className="sr-only" htmlFor="buscar-os">
              Buscar
            </label>
            <div className="search">
              <input
                id="buscar-os"
                type="text"
                className="busqueda-input"
                placeholder="Buscar por nombre"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </form>
          <div className="action-buttons">
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="btn outline-pink"
            >
              {estados.map((es) => (
                <option key={es} value={es}>
                  {es}
                </option>
              ))}
            </select>
            {isAdmin && (
              <button
                className="btn primary"
                onClick={() => {
                  setModalData(null);
                  setModalOpen(true);
                }}
              >
                + Agregar obra social
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card ninos-card">
        {loading ? (
          <div className="loader">Cargando…</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : items.length === 0 ? (
          <div className="empty">No se encontraron registros.</div>
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
                role="table"
                aria-label="Lista de obras sociales"
              >
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Estado</th>
                    <th className="col-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((o) => {
                    const isEditing = editId === o.id_obra_social;
                    return (
                      <tr key={o.id_obra_social}>
                        <td>
                          {isEditing ? (
                            <input
                              className="edit-input"
                              type="text"
                              value={
                                editData.nombre_obra_social ??
                                o.nombre_obra_social
                              }
                              onChange={(e) =>
                                setEditData((ed) => ({
                                  ...ed,
                                  nombre_obra_social: sanitizeNombreObra(
                                    e.target.value
                                  ),
                                }))
                              }
                            />
                          ) : (
                            sanitizeNombreObra(o.nombre_obra_social) || "—"
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <select
                              className="edit-select"
                              value={editData.estado ?? o.estado ?? ""}
                              onChange={(e) =>
                                setEditData((ed) => ({
                                  ...ed,
                                  estado: e.target.value,
                                }))
                              }
                            >
                              {estados
                                .filter((e) => e !== "todos")
                                .map((es) => (
                                  <option key={es} value={es}>
                                    {es}
                                  </option>
                                ))}
                            </select>
                          ) : (
                            o.estado || "—"
                          )}
                        </td>
                        <td className="col-actions">
                          <div className="row-actions">
                            <button
                              className="icon-btn info"
                              title="Información"
                              onClick={() => {
                                setModalData(o);
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
                                      Swal.fire({
                                        title: "Guardando...",
                                        allowOutsideClick: false,
                                        didOpen: () => Swal.showLoading(),
                                      });
                                      const payload = {};
                                      if (
                                        editData.nombre_obra_social !==
                                          undefined &&
                                        editData.nombre_obra_social !==
                                          o.nombre_obra_social
                                      ) {
                                        const nombreActualizado =
                                          sanitizeNombreObra(
                                            editData.nombre_obra_social
                                          );
                                        if (!nombreActualizado) {
                                          Swal.close();
                                          Swal.fire({
                                            icon: "warning",
                                            title: "Nombre requerido",
                                            text: "El nombre no puede quedar vacío.",
                                          });
                                          return;
                                        }
                                        const nombreCanonico =
                                          canonicalNombreObra(
                                            nombreActualizado
                                          );
                                        const duplicado = items.some(
                                          (item) =>
                                            item.id_obra_social !==
                                              o.id_obra_social &&
                                            canonicalNombreObra(
                                              item.nombre_obra_social
                                            ) === nombreCanonico
                                        );
                                        if (duplicado) {
                                          Swal.close();
                                          Swal.fire({
                                            icon: "error",
                                            title: "Duplicado",
                                            text: "Ya existe otra obra social con ese nombre.",
                                          });
                                          return;
                                        }
                                        payload.nombre_obra_social =
                                          nombreActualizado;
                                      }
                                      if (
                                        editData.estado !== undefined &&
                                        editData.estado !== o.estado
                                      ) {
                                        payload.estado = editData.estado;
                                      }
                                      await axios.put(
                                        `${API_BASE_URL}/api/obras-sociales/${o.id_obra_social}`,
                                        payload
                                      );
                                      setEditId(null);
                                      setEditData({});
                                      await fetchObras(busqueda, page, estado);
                                      Swal.close();
                                      Swal.fire({
                                        icon: "success",
                                        title: "Guardado",
                                        timer: 1200,
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
                                {isAdmin && (
                                  <>
                                    <button
                                      className="icon-btn edit"
                                      title="Editar"
                                      onClick={() => {
                                        setEditId(o.id_obra_social);
                                        setEditData({
                                          nombre_obra_social: sanitizeNombreObra(
                                            o.nombre_obra_social
                                          ),
                                          estado: o.estado,
                                        });
                                      }}
                                    >
                                      <MdEdit size={20} />
                                    </button>
                                    <button
                                      className="icon-btn delete"
                                      title="Eliminar"
                                      onClick={async () => {
                                        const result = await Swal.fire({
                                          title: "¿Eliminar?",
                                          text: "Esta acción no se puede deshacer.",
                                          icon: "warning",
                                          showCancelButton: true,
                                          confirmButtonText: "Sí, eliminar",
                                          cancelButtonText: "Cancelar",
                                        });
                                        if (result.isConfirmed) {
                                          try {
                                            Swal.fire({
                                              title: "Eliminando...",
                                              allowOutsideClick: false,
                                              didOpen: () => Swal.showLoading(),
                                            });
                                            await axios.delete(
                                              `${API_BASE_URL}/api/obras-sociales/${o.id_obra_social}`
                                            );
                                            await fetchObras(
                                              busqueda,
                                              page,
                                              estado
                                            );
                                            Swal.close();
                                            Swal.fire({
                                              icon: "success",
                                              title: "Eliminado",
                                              timer: 1200,
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
                                        }
                                      }}
                                    >
                                      <MdDelete size={20} />
                                    </button>
                                  </>
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

            {totalPages > 1 && (
              <div className="paginacion-sweeper">
                <button
                  className="sweeper-btn"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  &#60;
                </button>
                <span className="sweeper-info">
                  Página {page} de {totalPages}
                </span>
                <button
                  className="sweeper-btn"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  &#62;
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {modalOpen && modalData && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-info" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModalOpen(false)}>
              &times;
            </button>
            <h2>Información de la obra social</h2>
            <div className="modal-section">
              <div className="modal-row">
                <span>Nombre:</span> {modalData.nombre_obra_social}
              </div>
              <div className="modal-row">
                <span>Estado:</span> {modalData.estado}
              </div>
              <div className="modal-row">
                <span>ID:</span> {modalData.id_obra_social}
              </div>
            </div>
          </div>
        </div>
      )}

      {modalOpen && !modalData && (
        <CrearObraSocial
          estados={estados}
          onClose={() => setModalOpen(false)}
          onCreated={async () => {
            setModalOpen(false);
            await fetchObras(busqueda, page, estado);
          }}
        />
      )}
    </section>
  );
}
