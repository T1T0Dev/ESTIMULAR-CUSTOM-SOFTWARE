import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "../styles/NinosPage.css";
import Swal from "sweetalert2";
import { MdEdit, MdDelete } from "react-icons/md";
import { FaCheck, FaTimes, FaInfoCircle } from "react-icons/fa";
import CrearObraSocial from "../components/CrearObraSocial";
import API_BASE_URL from "../constants/api";
import useAuthStore from "../store/useAuthStore";
import fallbackObraLogo from "../assets/logo_estimular.png";

const currencyFormatterARS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatCurrencyARS = (value) => {
  if (value === null || value === undefined) return "—";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return "—";
  return currencyFormatterARS.format(numeric);
};

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

const normalizeObraRecord = (item) => {
  if (!item) return item;
  return {
    ...item,
    nombre_obra_social: sanitizeNombreObra(item?.nombre_obra_social),
  };
};

const resolveObraLogoUrl = (obra) => {
  if (!obra) return null;
  if (obra.logo_url) return obra.logo_url;
  if (typeof obra.logoPath === "string" && obra.logoPath.startsWith("http")) {
    return obra.logoPath;
  }
  if (typeof obra.logo_path === "string" && obra.logo_path.startsWith("http")) {
    return obra.logo_path;
  }
  return null;
};

const MAX_LOGO_SIZE_BYTES = 2.5 * 1024 * 1024; // 2.5 MB

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
  const canEditLogo = Boolean(isAdmin);

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
        setItems(data.map((item) => normalizeObraRecord(item)));
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

  const handleModalUpdated = useCallback(
    async (updated) => {
      if (!updated) return;
      const normalized = normalizeObraRecord(updated);
      setModalData(normalized);
      setItems((prev) =>
        Array.isArray(prev)
          ? prev.map((item) =>
              item?.id_obra_social === normalized.id_obra_social
                ? normalizeObraRecord({ ...item, ...normalized })
                : item
            )
          : prev
      );
      await fetchObras(busqueda, page, estado);
    },
    [busqueda, estado, page, fetchObras]
  );

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

            {isMobile ? (
              /* Vista de tarjetas para móviles */
              <div className="mobile-cards">
                {items.map((o) => {
                  const isEditing = editId === o.id_obra_social;
                  return (
                    <div key={o.id_obra_social} className="mobile-card">
                      <div className="mobile-card-header">
                        <div>
                          <div className="mobile-card-name">
                            {sanitizeNombreObra(o.nombre_obra_social) || "Sin nombre"}
                          </div>
                        </div>
                        <div className={`mobile-card-status ${o.estado ? 'active' : 'inactive'}`}>
                          {o.estado || 'Sin estado'}
                        </div>
                      </div>

                      <div className="mobile-card-actions">
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
                                    text: "No se pudo guardar los cambios.",
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
                          isAdmin && (
                            <button
                              className="icon-btn edit"
                              title="Editar"
                              onClick={() => {
                                setEditId(o.id_obra_social);
                                setEditData({
                                  nombre_obra_social: o.nombre_obra_social,
                                  estado: o.estado,
                                });
                              }}
                            >
                              <MdEdit size={20} />
                            </button>
                          )
                        )}
                        {isAdmin && !isEditing && (
                          <button
                            className="icon-btn danger"
                            title="Eliminar"
                            onClick={async () => {
                              const result = await Swal.fire({
                                title: "¿Eliminar obra social?",
                                text: `¿Estás seguro de eliminar "${o.nombre_obra_social}"?`,
                                icon: "warning",
                                showCancelButton: true,
                                confirmButtonColor: "#d33",
                                cancelButtonColor: "#3085d6",
                                confirmButtonText: "Sí, eliminar",
                                cancelButtonText: "Cancelar",
                              });
                              if (result.isConfirmed) {
                                try {
                                  await axios.delete(
                                    `${API_BASE_URL}/api/obras-sociales/${o.id_obra_social}`
                                  );
                                  await fetchObras(busqueda, page, estado);
                                  Swal.fire({
                                    icon: "success",
                                    title: "Eliminado",
                                    timer: 1200,
                                    showConfirmButton: false,
                                  });
                                } catch (err) {
                                  Swal.fire({
                                    icon: "error",
                                    title: "Error",
                                    text: "No se pudo eliminar la obra social.",
                                  });
                                }
                              }
                            }}
                          >
                            <MdDelete size={20} />
                          </button>
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
                aria-label="Lista de obras sociales"
              >
                <thead>
                  <tr>
                    <th className="col-logo">Logo</th>
                    <th>Nombre</th>
                    <th>Estado</th>
                    <th className="col-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((o) => {
                    const isEditing = editId === o.id_obra_social;
                    const logoSrc = resolveObraLogoUrl(o) || fallbackObraLogo;
                    return (
                      <tr key={o.id_obra_social}>
                        <td className="col-logo">
                          <div className="obra-logo-cell">
                            <img
                              src={logoSrc}
                              alt={`Logo de ${o.nombre_obra_social || "obra social"}`}
                              className="obra-logo-thumb"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = fallbackObraLogo;
                              }}
                            />
                          </div>
                        </td>
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
            )}

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
        <ObraSocialDetalleModal
          obra={modalData}
          onClose={() => {
            setModalOpen(false);
            setModalData(null);
          }}
          onUpdated={handleModalUpdated}
          canEditLogo={canEditLogo}
        />
      )}

      {modalOpen && !modalData && (
        <CrearObraSocial
          estados={estados}
          onClose={() => {
            setModalOpen(false);
            setModalData(null);
          }}
          onCreated={async () => {
            setModalOpen(false);
            setModalData(null);
            await fetchObras(busqueda, page, estado);
          }}
        />
      )}
    </section>
  );
}

function ObraSocialDetalleModal({ obra, onClose, onUpdated, canEditLogo = false }) {
  const [initialLogo, setInitialLogo] = useState(() => resolveObraLogoUrl(obra));
  const [logoPreview, setLogoPreview] = useState(() => resolveObraLogoUrl(obra) || fallbackObraLogo);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const nextLogo = resolveObraLogoUrl(obra);
    setInitialLogo(nextLogo);
    setLogoPreview(nextLogo || fallbackObraLogo);
    setLogoDataUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [obra]);

  const hasExistingLogo = useMemo(() => Boolean(initialLogo), [initialLogo]);
  const effectivePreview = logoPreview || fallbackObraLogo;

  const resetSelection = useCallback(() => {
    setLogoDataUrl(null);
    setLogoPreview(initialLogo || fallbackObraLogo);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [initialLogo]);

  const handleFileChange = useCallback(
    (event) => {
      if (processing || !canEditLogo) return;
      const file = event.target.files?.[0];
      if (!file) {
        resetSelection();
        return;
      }
      if (!file.type.startsWith("image/")) {
        Swal.fire({
          icon: "error",
          title: "Formato inválido",
          text: "Seleccioná un archivo de imagen (PNG, JPG, WEBP).",
        });
        event.target.value = "";
        return;
      }
      if (file.size > MAX_LOGO_SIZE_BYTES) {
        Swal.fire({
          icon: "warning",
          title: "Imagen demasiado grande",
          text: "Elegí una imagen de hasta 2.5 MB.",
        });
        event.target.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === "string") {
          setLogoDataUrl(result);
          setLogoPreview(result);
        }
      };
      reader.onerror = () => {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudo leer el archivo seleccionado.",
        });
      };
      reader.readAsDataURL(file);
    },
    [canEditLogo, processing, resetSelection]
  );

  const handleSaveLogo = useCallback(async () => {
    if (!canEditLogo) return;
    if (!logoDataUrl) {
      Swal.fire({
        icon: "info",
        title: "Seleccioná un logo",
        text: "Elegí una imagen antes de guardar.",
      });
      return;
    }
    setProcessing(true);
    try {
      Swal.fire({
        title: "Actualizando logo...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      const { data } = await axios.put(
        `${API_BASE_URL}/api/obras-sociales/${obra.id_obra_social}`,
        { logo: logoDataUrl }
      );
      Swal.close();
      const updated = data?.data;
      if (!updated) throw new Error("Respuesta inválida del servidor");
      await onUpdated?.(updated);
      const nextLogo = resolveObraLogoUrl(updated);
      setInitialLogo(nextLogo);
      setLogoPreview(nextLogo || fallbackObraLogo);
      setLogoDataUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      Swal.fire({
        icon: "success",
        title: "Logo actualizado",
        timer: 1300,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error?.response?.data?.message ||
          error?.message ||
          "No se pudo actualizar el logo.",
      });
    } finally {
      setProcessing(false);
    }
  }, [canEditLogo, logoDataUrl, obra?.id_obra_social, onUpdated]);

  const handleRemoveLogo = useCallback(async () => {
    if (!canEditLogo) return;
    if (!hasExistingLogo && !logoDataUrl) {
      resetSelection();
      return;
    }
    const result = await Swal.fire({
      title: "¿Quitar logo?",
      text: "La obra social quedará sin logo hasta subir uno nuevo.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, quitar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;
    setProcessing(true);
    try {
      Swal.fire({
        title: "Quitando logo...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      const { data } = await axios.put(
        `${API_BASE_URL}/api/obras-sociales/${obra.id_obra_social}`,
        { logo: null }
      );
      Swal.close();
      const updated = data?.data;
      if (!updated) throw new Error("Respuesta inválida del servidor");
      await onUpdated?.(updated);
      setInitialLogo(null);
      setLogoPreview(fallbackObraLogo);
      setLogoDataUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      Swal.fire({
        icon: "success",
        title: "Logo quitado",
        timer: 1300,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error?.response?.data?.message ||
          error?.message ||
          "No se pudo quitar el logo.",
      });
    } finally {
      setProcessing(false);
    }
  }, [canEditLogo, hasExistingLogo, logoDataUrl, obra?.id_obra_social, onUpdated, resetSelection]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-info modal-info--obra" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          &times;
        </button>
        <h2>Información de la obra social</h2>
        <div className="modal-section">
          <div className="modal-grid obra-modal-grid">
            <span className="label">Nombre:</span>
            <span className="value">{obra?.nombre_obra_social || "—"}</span>
            <span className="label">Estado:</span>
            <span className="value">{obra?.estado || "—"}</span>
            <span className="label">Cobertura:</span>
            <span className="value">
              {obra?.descuento === null || obra?.descuento === undefined
                ? "—"
                : formatCurrencyARS(obra.descuento)}
            </span>
          </div>
        </div>
        <div className="modal-section">
          <h3>Logo</h3>
          <div className="obra-logo-preview-wrapper">
            <img
              src={effectivePreview}
              alt={`Logo de ${obra?.nombre_obra_social || "obra social"}`}
              className="obra-logo-preview"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = fallbackObraLogo;
              }}
            />
          </div>
          <div className="obra-logo-actions">
            <label className="obra-logo-input">
              <span>Seleccionar imagen (PNG/JPG/WEBP, máx. 2.5 MB)</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="obra-logo-file"
                onChange={handleFileChange}
                disabled={processing || !canEditLogo}
                aria-disabled={!canEditLogo}
              />
            </label>
            <div className="obra-logo-buttons">
              <button
                type="button"
                className="obra-logo-btn obra-logo-btn--save"
                onClick={handleSaveLogo}
                disabled={processing || !logoDataUrl || !canEditLogo}
                aria-disabled={!canEditLogo}
                title={!canEditLogo ? "Solo administración puede modificar el logo" : undefined}
              >
                Guardar logo
              </button>
              <button
                type="button"
                className="obra-logo-btn obra-logo-btn--cancel"
                onClick={resetSelection}
                disabled={processing || !logoDataUrl || !canEditLogo}
                aria-disabled={!canEditLogo}
              >
                Cancelar cambio
              </button>
              <button
                type="button"
                className="obra-logo-btn obra-logo-btn--remove"
                onClick={handleRemoveLogo}
                disabled={processing || (!hasExistingLogo && !logoDataUrl) || !canEditLogo}
                aria-disabled={!canEditLogo}
                title={!canEditLogo ? "Solo administración puede quitar el logo" : undefined}
              >
                Quitar logo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
