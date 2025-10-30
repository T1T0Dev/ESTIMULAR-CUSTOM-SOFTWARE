import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import "../styles/NinosPage.css";
import CrearNino from "../components/CrearNino";
import Swal from "sweetalert2";
import { MdEdit, MdDelete } from "react-icons/md";
import { FaCheck, FaTimes, FaInfoCircle } from "react-icons/fa";
import { formatDateDMY } from "../utils/date";
import API_BASE_URL from "../constants/api";
import { parseNinosResponse } from "../utils/ninoResponse";

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

  function useDebounce(value, delay) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
      const t = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
  }
  const debouncedBusqueda = useDebounce(busqueda, 300);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
  const res = await axios.get(`${API_BASE_URL}/api/obras-sociales`);
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
            <button
              className="btn primary"
              onClick={() => {
                setModalData(null);
                setModalOpen(true);
              }}
            >
              + Agregar niño
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
                        <td className="col-dni">
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
                        <td className="col-name">
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
                        <td className="col-last">
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
                        <td className="col-dniNac">
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
                        <td className="col-cert">
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
                        <td className="col-os">
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

                        <td>
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
                        <td className="col-actions">
                          <div className="row-actions">
                            <button
                              className="icon-btn info"
                              title="Información"
                              onClick={() => {
                                setModalData(c);
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
          </div>
        </div>
      )}

      {modalOpen && !modalData && (
        <CrearNino
          onClose={() => setModalOpen(false)}
          obrasSociales={obrasSociales}
          onCreated={async () => {
            setModalOpen(false);
            await fetchNinos(busqueda, page, tipo);
          }}
        />
      )}
    </section>
  );
}
