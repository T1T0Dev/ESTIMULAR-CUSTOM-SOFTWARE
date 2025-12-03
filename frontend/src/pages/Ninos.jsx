import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import "../styles/NinosPage.css";
import CrearNino from "../components/CrearNino";
import Swal from "sweetalert2";
import { MdEdit, MdDelete } from "react-icons/md";
import {
  FaCheck,
  FaTimes,
  FaInfoCircle,
  FaStar,
  FaUserPlus,
  FaUnlink,
} from "react-icons/fa";
import { formatDateDMY } from "../utils/date";
import API_BASE_URL from "../constants/api";
import { parseNinosResponse } from "../utils/ninoResponse";
import useAuthStore from "../store/useAuthStore";

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return "";
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
}

export default function Ninos() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.es_admin || (user?.roles?.some(role => role.nombre?.toLowerCase() === 'admin'));

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

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("todos"); // todos | candidato | paciente
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const pageSize = 10;
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [obrasSociales, setObrasSociales] = useState([]);
  const skipPageEffectRef = useRef(false);
  const [responsablesVinculados, setResponsablesVinculados] = useState([]);
  const [responsablesLoading, setResponsablesLoading] = useState(false);
  const [responsablesError, setResponsablesError] = useState(null);
  const [responsableSearch, setResponsableSearch] = useState("");
  const [responsableResults, setResponsableResults] = useState([]);
  const [responsableSearchLoading, setResponsableSearchLoading] =
    useState(false);

  function useDebounce(value, delay) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
      const t = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
  }
  const debouncedBusqueda = useDebounce(busqueda, 300);
  const debouncedResponsableSearch = useDebounce(responsableSearch, 300);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/obras-sociales`, {
          params: { estado: "activa", pageSize: 500 },
        });
        if (mounted) setObrasSociales(res?.data?.data || []);
      } catch (e) {
        // Evitar fallo silencioso y ayudar en debug si la petición falla
        console.error("Error cargando obras sociales:", e);
      }
    })();
    return () => (mounted = false);
  }, []);

  const fetchNinos = useCallback(
    async (search = "", pageNum = 1, tipoSel = "todos") => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/api/ninos`, {
          params: { search, page: pageNum, pageSize, tipo: tipoSel },
        });
        const { list: normalized, total: computedTotal } = parseNinosResponse(
          res?.data
        );
        setItems(normalized);
        setTotal(computedTotal);
        setError(null);
      } catch (e) {
        console.error("Error al obtener los niños:", e);
        setError("Error al obtener los niños");
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  useEffect(() => {
    skipPageEffectRef.current = true;
    setPage(1);
    fetchNinos(debouncedBusqueda, 1, tipo);
  }, [debouncedBusqueda, tipo, fetchNinos]);

  useEffect(() => {
    if (skipPageEffectRef.current) {
      skipPageEffectRef.current = false;
      return;
    }
    fetchNinos(busqueda, page, tipo);
    // We intentionally only react to page changes here; search/tipo changes are handled above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleBuscar = (e) => {
    e.preventDefault();
    setPage(1);
    fetchNinos(busqueda, 1, tipo);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalData(null);
    setResponsablesVinculados([]);
    setResponsablesError(null);
    setResponsablesLoading(false);
    setResponsableSearch("");
    setResponsableResults([]);
    setResponsableSearchLoading(false);
  };

  const cargarResponsables = useCallback(async (idNino) => {
    if (!idNino) return;
    setResponsablesLoading(true);
    setResponsablesError(null);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/ninos/${idNino}/responsables`
      );
      const relaciones = (res?.data?.data || []).map((rel) => ({
        ...rel,
        parentescoDraft: rel.parentesco || "",
      }));
      relaciones.sort(
        (a, b) => (b.es_principal === true) - (a.es_principal === true)
      );
      setResponsablesVinculados(relaciones);
    } catch (err) {
      console.error("Error cargando responsables del niño:", err);
      setResponsablesError("No se pudieron cargar los responsables");
      setResponsablesVinculados([]);
    } finally {
      setResponsablesLoading(false);
    }
  }, []);

  const abrirDetalleNino = (nino) => {
    setModalData(nino);
    setModalOpen(true);
    cargarResponsables(nino.id_nino);
  };

  useEffect(() => {
    if (!modalOpen || !modalData) return;
    const query = debouncedResponsableSearch.trim();
    if (query.length < 2) {
      setResponsableResults([]);
      setResponsableSearchLoading(false);
      return;
    }

    let cancelado = false;
    setResponsableSearchLoading(true);
    axios
      .get(`${API_BASE_URL}/api/responsables`, {
        params: { search: query, page: 1, pageSize: 5 },
      })
      .then((res) => {
        if (cancelado) return;
        const data = res?.data?.data || [];
        const filtrados = data.filter(
          (resp) =>
            !responsablesVinculados.some(
              (rel) => rel.responsable?.id_responsable === resp.id_responsable
            )
        );
        setResponsableResults(filtrados);
      })
      .catch((err) => {
        if (cancelado) return;
        console.error("Error buscando responsables:", err);
        setResponsableResults([]);
      })
      .finally(() => {
        if (!cancelado) setResponsableSearchLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [
    debouncedResponsableSearch,
    modalOpen,
    modalData,
    responsablesVinculados,
  ]);

  const marcarPrincipal = async (relacion) => {
    if (!modalData || !relacion?.id_nino_responsable) return;
    const nuevo = !relacion.es_principal;
    try {
      await axios.put(
        `${API_BASE_URL}/api/ninos/${modalData.id_nino}/responsables/${relacion.id_nino_responsable}`,
        { es_principal: nuevo }
      );
      setResponsablesVinculados((prev) => {
        const actualizados = prev.map((rel) => {
          if (rel.id_nino_responsable === relacion.id_nino_responsable) {
            return { ...rel, es_principal: nuevo };
          }
          return nuevo ? { ...rel, es_principal: false } : rel;
        });
        actualizados.sort(
          (a, b) => (b.es_principal === true) - (a.es_principal === true)
        );
        return actualizados;
      });
    } catch (err) {
      console.error("Error actualizando principal:", err);
      Swal.fire({
        icon: "error",
        title: "No se pudo actualizar principal",
      });
    }
  };

  const cambiarParentescoLocal = (relacionId, valor) => {
    setResponsablesVinculados((prev) =>
      prev.map((rel) =>
        rel.id_nino_responsable === relacionId
          ? { ...rel, parentescoDraft: valor }
          : rel
      )
    );
  };

  const guardarParentesco = async (relacion) => {
    if (!modalData || !relacion?.id_nino_responsable) return;
    const nuevo = (relacion.parentescoDraft || "").trim();
    const original = relacion.parentesco ? relacion.parentesco : "";
    if (nuevo === original) return;
    try {
      await axios.put(
        `${API_BASE_URL}/api/ninos/${modalData.id_nino}/responsables/${relacion.id_nino_responsable}`,
        { parentesco: nuevo || null }
      );
      setResponsablesVinculados((prev) =>
        prev.map((rel) =>
          rel.id_nino_responsable === relacion.id_nino_responsable
            ? { ...rel, parentesco: nuevo || null, parentescoDraft: nuevo }
            : rel
        )
      );
      Swal.fire({
        icon: "success",
        title: "Parentesco actualizado",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Error actualizando parentesco:", err);
      Swal.fire({
        icon: "error",
        title: "No se pudo actualizar el parentesco",
      });
      setResponsablesVinculados((prev) =>
        prev.map((rel) =>
          rel.id_nino_responsable === relacion.id_nino_responsable
            ? { ...rel, parentescoDraft: original }
            : rel
        )
      );
    }
  };

  const quitarResponsable = async (relacion) => {
    if (!modalData || !relacion?.id_nino_responsable) return;
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Quitar responsable",
      text: "Esta relación se eliminará. ¿Continuar?",
      showCancelButton: true,
      confirmButtonText: "Sí, quitar",
      cancelButtonText: "Cancelar",
    });
    if (!confirm.isConfirmed) return;
    try {
      await axios.delete(
        `${API_BASE_URL}/api/ninos/${modalData.id_nino}/responsables/${relacion.id_nino_responsable}`
      );
      setResponsablesVinculados((prev) =>
        prev.filter(
          (rel) => rel.id_nino_responsable !== relacion.id_nino_responsable
        )
      );
      Swal.fire({
        icon: "success",
        title: "Relación eliminada",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Error quitando responsable:", err);
      Swal.fire({
        icon: "error",
        title: "No se pudo eliminar la relación",
      });
    }
  };

  const vincularResponsable = async (responsable) => {
    if (!modalData) return;
    const { value: formValues } = await Swal.fire({
      title: `Vincular a ${responsable.nombre ?? "Responsable"}`,
      html: `
        <div class="swal-form">
          <label for="parentesco-input" class="swal2-label">Parentesco (opcional)</label>
          <input id="parentesco-input" class="swal2-input" placeholder="Ej: madre, tutor" />
          <label class="swal2-checkbox" style="justify-content:flex-start;gap:0.5rem;margin-top:0.5rem;">
            <input id="principal-input" type="checkbox" />
            <span>Marcar como responsable principal</span>
          </label>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Vincular",
      cancelButtonText: "Cancelar",
      focusConfirm: false,
      preConfirm: () => {
        const parentescoValue = document
          .getElementById("parentesco-input")
          ?.value?.trim();
        const esPrincipalValue =
          document.getElementById("principal-input")?.checked;
        return {
          parentesco: parentescoValue || "",
          esPrincipal: !!esPrincipalValue,
        };
      },
    });

    if (!formValues) return;

    try {
      await axios.post(
        `${API_BASE_URL}/api/ninos/${modalData.id_nino}/responsables`,
        {
          id_responsable: responsable.id_responsable,
          parentesco: formValues.parentesco || null,
          es_principal: formValues.esPrincipal,
        }
      );
      await cargarResponsables(modalData.id_nino);
      setResponsableResults((prev) =>
        prev.filter((r) => r.id_responsable !== responsable.id_responsable)
      );
      Swal.fire({
        icon: "success",
        title: "Responsable vinculado",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Error vinculando responsable:", err);
      Swal.fire({
        icon: "error",
        title: "No se pudo vincular",
        text: err?.response?.data?.message || "",
      });
    }
  };

  useEffect(() => {
    if (!modalOpen) {
      setResponsableSearch("");
      setResponsableResults([]);
    }
  }, [modalOpen]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <section className="ninos-page">
      <div className="ninos-top">
        <h1 className="ninos-title">Niños </h1>
        <div className="ninos-controls">
          <form
            className="busqueda-form"
            onSubmit={handleBuscar}
            role="search"
            aria-label="Buscar niños"
          >
            <label className="sr-only" htmlFor="buscar">
              Buscar
            </label>
            <div className="search">
              <input
                id="buscar"
                type="text"
                className="busqueda-input"
                placeholder="Buscar por nombre, apellido o DNI"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </form>

          <div className="action-buttons">
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="btn outline-pink"
            >
              <option value="todos">Todos</option>
              <option value="candidato">Candidatos</option>
              <option value="paciente">Pacientes</option>
            </select>
            {isAdmin && (
              <button
                className="btn primary"
                onClick={() => {
                  setModalData(null);
                  setModalOpen(true);
                }}
              >
                + Agregar niño
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
              {isMobile ? (
                /* Vista de tarjetas para móviles */
                <div className="mobile-cards">
                  {items.map((c) => {
                    const isEditing = editId === c.id_nino;
                    const obraSocialName =
                      c.obra_social?.nombre_obra_social || null;
                    return (
                      <div key={c.id_nino} className="mobile-card">
                        <div className="mobile-card-header">
                          <h3 className="mobile-card-title">
                            {c.nombre} {c.apellido}
                          </h3>
                          <span className={`mobile-card-status ${c.tipo === 'paciente' ? 'paciente' : 'candidato'}`}>
                            {c.tipo === 'paciente' ? 'Paciente' : 'Candidato'}
                          </span>
                        </div>

                        <div className="mobile-card-content">
                          <div className="mobile-card-field">
                            <span className="mobile-card-label">DNI:</span>
                            <span className="mobile-card-value">{c.dni || "No especificado"}</span>
                          </div>
                          <div className="mobile-card-field">
                            <span className="mobile-card-label">Edad:</span>
                            <span className="mobile-card-value">
                              {c.fecha_nacimiento ? `${calcularEdad(c.fecha_nacimiento)} años` : "No especificada"}
                            </span>
                          </div>
                          <div className="mobile-card-field">
                            <span className="mobile-card-label">Certificado:</span>
                            <span className="mobile-card-value">
                              {c.certificado_discapacidad ? "SI" : "NO"}
                            </span>
                          </div>
                          <div className="mobile-card-field">
                            <span className="mobile-card-label">Obra Social:</span>
                            <span className="mobile-card-value">
                              {obraSocialName || "No especificada"}
                            </span>
                          </div>
                        </div>

                        <div className="mobile-card-actions">
                          <button
                            className="mobile-card-btn info"
                            onClick={() => abrirDetalleNino(c)}
                          >
                            <FaInfoCircle size={16} />
                            Ver detalles
                          </button>
                          {isAdmin && (
                            <>
                              {isEditing ? (
                                <>
                                  <button
                                    className="mobile-card-btn save"
                                    onClick={async () => {
                                      try {
                                        Swal.fire({
                                          title: "Guardando...",
                                          allowOutsideClick: false,
                                          didOpen: () => Swal.showLoading(),
                                        });
                                        // Build payload only with changed fields
                                        const payload = {};
                                        if (editData.nombre !== undefined && editData.nombre !== c.nombre) {
                                          payload.nombre = editData.nombre;
                                        }
                                        if (editData.apellido !== undefined && editData.apellido !== c.apellido) {
                                          payload.apellido = editData.apellido;
                                        }
                                        if (editData.dni !== undefined) {
                                          const newDni = editData.dni !== null && editData.dni !== undefined
                                            ? String(editData.dni).trim()
                                            : null;
                                          if (newDni !== (c.dni ?? null)) payload.dni = newDni;
                                        }
                                        if (editData.fecha_nacimiento !== undefined) {
                                          const newFecha = editData.fecha_nacimiento === "" ? null : editData.fecha_nacimiento;
                                          const currentFecha = c.fecha_nacimiento ?? null;
                                          if (newFecha !== currentFecha) payload.fecha_nacimiento = newFecha;
                                        }
                                        if (editData.certificado_discapacidad !== undefined) {
                                          const newCert = !!editData.certificado_discapacidad;
                                          if (newCert !== !!c.certificado_discapacidad) payload.certificado_discapacidad = newCert;
                                        }
                                        if (editData.id_obra_social !== undefined) {
                                          const newOs = editData.id_obra_social ?? null;
                                          if ((newOs ?? null) !== (c.id_obra_social ?? null)) payload.id_obra_social = newOs;
                                        }
                                        if (editData.tipo !== undefined && editData.tipo !== c.tipo) {
                                          payload.tipo = editData.tipo;
                                        }
                                        await axios.put(`${API_BASE_URL}/api/ninos/${c.id_nino}`, payload);
                                        setEditId(null);
                                        setEditData({});
                                        await fetchNinos(busqueda, page, tipo);
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
                                          text: err?.response?.data?.message || "No se pudo guardar",
                                        });
                                      }
                                    }}
                                  >
                                    <FaCheck size={16} />
                                    Guardar
                                  </button>
                                  <button
                                    className="mobile-card-btn cancel"
                                    onClick={() => {
                                      setEditId(null);
                                      setEditData({});
                                    }}
                                  >
                                    <FaTimes size={16} />
                                    Cancelar
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className="mobile-card-btn edit"
                                    onClick={() => {
                                      setEditId(c.id_nino);
                                      setEditData({
                                        nombre: c.nombre,
                                        apellido: c.apellido,
                                        dni: c.dni,
                                        fecha_nacimiento: c.fecha_nacimiento
                                          ? String(c.fecha_nacimiento).slice(0, 10)
                                          : "",
                                        certificado_discapacidad: !!c.certificado_discapacidad,
                                        id_obra_social: c.id_obra_social ?? null,
                                        tipo: c.tipo,
                                      });
                                    }}
                                  >
                                    <MdEdit size={16} />
                                    Editar
                                  </button>
                                  <button
                                    className="mobile-card-btn delete"
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
                                          await axios.delete(`${API_BASE_URL}/api/ninos/${c.id_nino}`);
                                          await fetchNinos(busqueda, page, tipo);
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
                                            text: err?.response?.data?.message || "No se pudo eliminar",
                                          });
                                        }
                                      }
                                    }}
                                  >
                                    <MdDelete size={16} />
                                    Eliminar
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Vista de tabla para desktop */
                <table
                  className="table candidatos-table"
                  role="table"
                  aria-label="Lista de niños"
                >
                <thead>
                  <tr>
                    <th className="col-dni">DNI</th>
                    <th className="col-name">Nombre</th>
                    <th className="col-last">Apellido</th>
                    <th className="col-dniNac">Edad</th>
                    <th className="col-cert">Certificado</th>
                    <th className="col-os">Obra Social</th>
                    <th>Tipo</th>
                    <th className="col-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => {
                    const isEditing = editId === c.id_nino;
                    const obraSocialName =
                      c.obra_social?.nombre_obra_social || null;
                    return (
                      <tr key={c.id_nino}>
                        <td className="col-dni" data-label="DNI">
                          {isEditing ? (
                            <input
                              className="edit-input"
                              type="text"
                              value={editData.dni ?? c.dni ?? ""}
                              onChange={(e) =>
                                setEditData((ed) => ({
                                  ...ed,
                                  dni: e.target.value,
                                }))
                              }
                            />
                          ) : (
                            c.dni || "—"
                          )}
                        </td>
                        <td className="col-name" data-label="Nombre">
                          {isEditing ? (
                            <input
                              className="edit-input"
                              type="text"
                              value={editData.nombre ?? c.nombre}
                              onChange={(e) =>
                                setEditData((ed) => ({
                                  ...ed,
                                  nombre: e.target.value,
                                }))
                              }
                            />
                          ) : (
                            c.nombre || "—"
                          )}
                        </td>
                        <td className="col-last" data-label="Apellido">
                          {isEditing ? (
                            <input
                              className="edit-input"
                              type="text"
                              value={editData.apellido ?? c.apellido}
                              onChange={(e) =>
                                setEditData((ed) => ({
                                  ...ed,
                                  apellido: e.target.value,
                                }))
                              }
                            />
                          ) : (
                            c.apellido || "—"
                          )}
                        </td>
                        <td className="col-dniNac" data-label="Edad">
                          {isEditing ? (
                            <input
                              type="date"
                              className="edit-input"
                              value={
                                editData.fecha_nacimiento !== undefined
                                  ? editData.fecha_nacimiento
                                  : c.fecha_nacimiento
                                  ? String(c.fecha_nacimiento).slice(0, 10)
                                  : ""
                              }
                              onChange={(e) =>
                                setEditData((ed) => ({
                                  ...ed,
                                  fecha_nacimiento: e.target.value,
                                }))
                              }
                            />
                          ) : c.fecha_nacimiento ? (
                            `${formatDateDMY(
                              c.fecha_nacimiento
                            )} (${calcularEdad(c.fecha_nacimiento)} años)`
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="col-cert" data-label="Certificado">
                          {isEditing ? (
                            <select
                              className="edit-select"
                              value={
                                editData.certificado_discapacidad ??
                                c.certificado_discapacidad
                                  ? "si"
                                  : "no"
                              }
                              onChange={(e) =>
                                setEditData((ed) => ({
                                  ...ed,
                                  certificado_discapacidad:
                                    e.target.value === "si",
                                }))
                              }
                            >
                              <option value="si">SI</option>
                              <option value="no">NO</option>
                            </select>
                          ) : c.certificado_discapacidad ? (
                            "SI"
                          ) : (
                            "NO"
                          )}
                        </td>
                        <td className="col-os" data-label="Obra social">
                          {isEditing ? (
                            <select
                              className="edit-select"
                              value={
                                editData.id_obra_social ??
                                c.id_obra_social ??
                                ""
                              }
                              onChange={(e) =>
                                setEditData((ed) => ({
                                  ...ed,
                                  id_obra_social: e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                }))
                              }
                            >
                              <option value="">
                                -- Seleccionar obra social --
                              </option>
                              {obrasSociales.map((o) => (
                                <option
                                  key={o.id_obra_social}
                                  value={o.id_obra_social}
                                >
                                  {o.nombre_obra_social}
                                </option>
                              ))}
                            </select>
                          ) : (
                            obraSocialName || "—"
                          )}
                        </td>

                        <td data-label="Tipo">
                          {isEditing ? (
                            <select
                              value={editData.tipo ?? c.tipo ?? "candidato"}
                              onChange={(e) =>
                                setEditData((ed) => ({
                                  ...ed,
                                  tipo: e.target.value,
                                }))
                              }
                            >
                              <option value="candidato">candidato</option>
                              <option value="paciente">paciente</option>
                            </select>
                          ) : (
                            c.tipo
                          )}
                        </td>
                        <td className="col-actions" data-label="Acciones">
                          <div className="row-actions">
                            <button
                              className="icon-btn info"
                              title="Información"
                              onClick={() => abrirDetalleNino(c)}
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
                                      // Build payload only with changed fields, avoid overwriting unintentionally
                                      const payload = {};
                                      // nombre
                                      if (
                                        editData.nombre !== undefined &&
                                        editData.nombre !== c.nombre
                                      ) {
                                        payload.nombre = editData.nombre;
                                      }
                                      // apellido
                                      if (
                                        editData.apellido !== undefined &&
                                        editData.apellido !== c.apellido
                                      ) {
                                        payload.apellido = editData.apellido;
                                      }
                                      // dni (send trimmed string or null)
                                      if (editData.dni !== undefined) {
                                        const newDni =
                                          editData.dni !== null &&
                                          editData.dni !== undefined
                                            ? String(editData.dni).trim()
                                            : null;
                                        if (newDni !== (c.dni ?? null))
                                          payload.dni = newDni;
                                      }
                                      // fecha_nacimiento (normalize empty string to null)
                                      if (
                                        editData.fecha_nacimiento !== undefined
                                      ) {
                                        const newFecha =
                                          editData.fecha_nacimiento === ""
                                            ? null
                                            : editData.fecha_nacimiento;
                                        const currentFecha =
                                          c.fecha_nacimiento ?? null;
                                        if (newFecha !== currentFecha)
                                          payload.fecha_nacimiento = newFecha;
                                      }
                                      // certificado_discapacidad (coalesce and compare)
                                      if (
                                        editData.certificado_discapacidad !==
                                        undefined
                                      ) {
                                        const newCert =
                                          !!editData.certificado_discapacidad;
                                        if (
                                          newCert !==
                                          !!c.certificado_discapacidad
                                        )
                                          payload.certificado_discapacidad =
                                            newCert;
                                      }
                                      // id_obra_social (allow null)
                                      if (
                                        editData.id_obra_social !== undefined
                                      ) {
                                        const newOs =
                                          editData.id_obra_social ?? null;
                                        if (
                                          (newOs ?? null) !==
                                          (c.id_obra_social ?? null)
                                        )
                                          payload.id_obra_social = newOs;
                                      }
                                      // tipo
                                      if (
                                        editData.tipo !== undefined &&
                                        editData.tipo !== c.tipo
                                      ) {
                                        payload.tipo = editData.tipo;
                                      }
                                      await axios.put(
                                        `${API_BASE_URL}/api/ninos/${c.id_nino}`,
                                        payload
                                      );
                                      setEditId(null);
                                      setEditData({});
                                      await fetchNinos(busqueda, page, tipo);
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
                                        setEditId(c.id_nino);
                                        setEditData({
                                          nombre: c.nombre,
                                          apellido: c.apellido,
                                          dni: c.dni,
                                          fecha_nacimiento: c.fecha_nacimiento
                                            ? String(c.fecha_nacimiento).slice(
                                                0,
                                                10
                                              )
                                            : "",
                                          certificado_discapacidad:
                                            !!c.certificado_discapacidad,
                                          id_obra_social: c.id_obra_social ?? null,
                                          tipo: c.tipo,
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
                                              `${API_BASE_URL}/api/ninos/${c.id_nino}`
                                            );
                                            await fetchNinos(busqueda, page, tipo);
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
              )}
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
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-info" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-mobile" onClick={closeModal}>
              ✕ Cerrar
            </button>
            <button className="modal-close" onClick={closeModal}>
              &times;
            </button>
            <h2>Información del niño</h2>
            <div className="modal-section">
              <h3>Datos</h3>
              <div className="modal-row">
                <span>Nombre:</span> {modalData.nombre}
              </div>
              <div className="modal-row">
                <span>Apellido:</span> {modalData.apellido}
              </div>
              <div className="modal-row">
                <span>Fecha de nacimiento:</span>{" "}
                {formatDateDMY(modalData.fecha_nacimiento)} (
                {calcularEdad(modalData.fecha_nacimiento)} años)
              </div>
              <div className="modal-row">
                <span>DNI:</span> {modalData.dni}
              </div>
              <div className="modal-row">
                <span>Certificado discapacidad:</span>{" "}
                {modalData.certificado_discapacidad ? "SI" : "NO"}
              </div>
              <div className="modal-row">
                <span>Tipo:</span> {modalData.tipo}
              </div>
            </div>

            <div className="modal-section">
              <h3>Obra Social</h3>
              <div className="modal-row">
                <span>Nombre:</span>{" "}
                {modalData.obra_social?.nombre_obra_social || "—"}
              </div>
            </div>

            <div className="modal-section">
              <h3>Responsables a cargo</h3>
              <p className="section-help">
                Visualiza, agrega y gestiona los responsables asociados a este
                niño. El responsable principal se destaca con un ícono.
              </p>

              <div className="relationship-search">
                <label htmlFor="buscar-responsable" className="sr-only">
                  Buscar responsable
                </label>
                <input
                  id="buscar-responsable"
                  type="text"
                  value={responsableSearch}
                  onChange={(e) => setResponsableSearch(e.target.value)}
                  placeholder="Buscar responsable por nombre, apellido o DNI"
                />
                {responsableSearchLoading && (
                  <div className="inline-loader">Buscando…</div>
                )}
                {!responsableSearchLoading && responsableResults.length > 0 && (
                  <ul className="search-results">
                    {responsableResults.map((resp) => (
                      <li key={resp.id_responsable}>
                        <div className="result-info">
                          <strong>
                            {resp.nombre} {resp.apellido}
                          </strong>
                          <span>
                            DNI: {resp.dni || "—"} · Tel: {resp.telefono || "—"}
                          </span>
                        </div>
                        <button
                          className="btn small"
                          onClick={() => vincularResponsable(resp)}
                        >
                          <FaUserPlus size={14} /> Vincular
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {!responsableSearchLoading &&
                  responsableSearch.trim().length >= 2 &&
                  responsableResults.length === 0 && (
                    <div className="search-empty">
                      Sin coincidencias disponibles o ya vinculadas.
                    </div>
                  )}
              </div>

              <div className="relationship-list">
                {responsablesLoading ? (
                  <div className="loader">Cargando responsables…</div>
                ) : responsablesError ? (
                  <div className="error">{responsablesError}</div>
                ) : responsablesVinculados.length === 0 ? (
                  <div className="empty">
                    No hay responsables asociados todavía. Usa la búsqueda para
                    vincular uno existente.
                  </div>
                ) : (
                  <div className="dashboard-table-wrapper">
                    <table
                      className="table"
                      aria-label="Responsables asociados"
                    >
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>DNI</th>
                          <th>Contacto</th>
                          <th>Parentesco</th>
                          {isAdmin && <th>Principal</th>}
                          <th className="col-actions">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {responsablesVinculados.map((rel) => (
                          <tr
                            key={rel.id_nino_responsable}
                            className={rel.es_principal ? "row-principal" : ""}
                          >
                            <td data-label="Nombre">
                              <div className="cell-stack">
                                <span className="cell-strong">
                                  {rel.responsable?.nombre || "—"}{" "}
                                  {rel.responsable?.apellido || ""}
                                </span>
                                {rel.es_principal && (
                                  <span className="tag principal">
                                    <FaStar size={12} /> Principal
                                  </span>
                                )}
                              </div>
                            </td>
                            <td data-label="DNI">
                              {rel.responsable?.dni || "—"}
                            </td>
                            <td className="cell-stack" data-label="Contacto">
                              <span>{rel.responsable?.telefono || "—"}</span>
                              <span className="muted-text">
                                {rel.responsable?.email || "—"}
                              </span>
                            </td>
                            {true && (
                              <td data-label="Parentesco">
                                <input
                                  className="table-input"
                                  value={rel.parentescoDraft ?? ""}
                                  onChange={(e) =>
                                    cambiarParentescoLocal(
                                      rel.id_nino_responsable,
                                      e.target.value
                                    )
                                  }
                                  onBlur={() => guardarParentesco(rel)}
                                  placeholder="Ej: madre"
                                  disabled={!isAdmin}
                                />
                              </td>
                            )}
                            {isAdmin && (
                              <td data-label="Principal">
                                <label className="inline-check">
                                  <input
                                    type="checkbox"
                                    checked={!!rel.es_principal}
                                    onChange={() => marcarPrincipal(rel)}
                                    aria-label="Marcar como principal"
                                  />
                                  {rel.es_principal ? "Sí" : "No"}
                                </label>
                              </td>
                            )}
                            <td className="col-actions" data-label="Acciones">
                              <div className="row-actions">
                                {isAdmin && (
                                  <button
                                    className="icon-btn danger"
                                    title="Quitar responsable"
                                    onClick={() => quitarResponsable(rel)}
                                  >
                                    <FaUnlink size={18} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {modalOpen && !modalData && (
        <CrearNino
          onClose={closeModal}
          obrasSociales={obrasSociales}
          onCreated={async () => {
            closeModal();
            await fetchNinos(busqueda, page, tipo);
          }}
        />
      )}
    </section>
  );
}
