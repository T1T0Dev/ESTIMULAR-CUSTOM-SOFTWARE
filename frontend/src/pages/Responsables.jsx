import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import "../styles/NinosPage.css";
import Swal from "sweetalert2";
import { FaChild, FaStar, FaUserPlus, FaUnlink } from "react-icons/fa";
import { MdEdit, MdDelete, MdCheck, MdClose } from "react-icons/md";
import { formatDateDMY } from "../utils/date";

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Responsables() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null); // responsable seleccionado
  const [editId, setEditId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [ninosVinculados, setNinosVinculados] = useState([]);
  const [ninosLoading, setNinosLoading] = useState(false);
  const [ninosError, setNinosError] = useState(null);
  const [ninoSearch, setNinoSearch] = useState("");
  const [ninoResults, setNinoResults] = useState([]);
  const [ninoSearchLoading, setNinoSearchLoading] = useState(false);
  const pageSize = 10;
  const skipPageEffectRef = useRef(false);
  const debouncedBusqueda = useDebounce(busqueda, 300);
  const debouncedNinoSearch = useDebounce(ninoSearch, 300);

  const fetchResponsables = useCallback(
    async (search = "", pageNum = 1) => {
      setLoading(true);
      try {
        const res = await axios.get("http://localhost:5000/api/responsables", {
          params: { search, page: pageNum, pageSize },
        });
        setItems(res.data.data || []);
        setTotal(res.data.total || 0);
        setError(null);
      } catch (e) {
        console.error("Error al obtener responsables:", e);
        setError("Error al obtener responsables");
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  useEffect(() => {
    skipPageEffectRef.current = true;
    setPage(1);
    fetchResponsables(debouncedBusqueda, 1);
  }, [debouncedBusqueda, fetchResponsables]);

  useEffect(() => {
    if (skipPageEffectRef.current) {
      skipPageEffectRef.current = false;
      return;
    }
    fetchResponsables(busqueda, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleBuscar = (e) => {
    e.preventDefault();
    setPage(1);
    fetchResponsables(busqueda, 1);
  };

  const totalPages = Math.ceil(total / pageSize);

  const closeModal = () => {
    setModalOpen(false);
    setModalData(null);
    setNinosVinculados([]);
    setNinosLoading(false);
    setNinosError(null);
    setNinoSearch("");
    setNinoResults([]);
    setNinoSearchLoading(false);
  };

  const cargarNinosDeResponsable = useCallback(async (idResponsable) => {
    if (!idResponsable) return;
    setNinosLoading(true);
    setNinosError(null);
    try {
      const res = await axios.get(
        `http://localhost:5000/api/responsables/${idResponsable}/ninos`
      );
      const relaciones = (res?.data?.data || []).map((rel) => ({
        ...rel,
        parentescoDraft: rel.parentesco || "",
      }));
      relaciones.sort(
        (a, b) => (b.es_principal === true) - (a.es_principal === true)
      );
      setNinosVinculados(relaciones);
    } catch (e) {
      console.error("Error cargando niños del responsable:", e);
      setNinosError("No se pudieron cargar los niños asociados");
      setNinosVinculados([]);
    } finally {
      setNinosLoading(false);
    }
  }, []);

  const abrirInfo = (resp) => {
    setModalData(resp);
    setModalOpen(true);
    setNinoSearch("");
    setNinoResults([]);
    cargarNinosDeResponsable(resp.id_responsable);
  };

  const togglePrincipal = async (rel) => {
    if (!rel?.id_nino_responsable || !rel?.nino?.id_nino) return;
    const nuevo = !rel.es_principal;
    try {
      await axios.put(
        `http://localhost:5000/api/ninos/${rel.nino.id_nino}/responsables/${rel.id_nino_responsable}`,
        { es_principal: nuevo }
      );
      setNinosVinculados((prev) => {
        const actualizados = prev.map((item) =>
          item.id_nino_responsable === rel.id_nino_responsable
            ? { ...item, es_principal: nuevo }
            : item
        );
        actualizados.sort(
          (a, b) => (b.es_principal === true) - (a.es_principal === true)
        );
        return actualizados;
      });
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: "error", title: "No se pudo actualizar principal" });
    }
  };

  const cambiarParentescoLocal = (relacionId, valor) => {
    setNinosVinculados((prev) =>
      prev.map((rel) =>
        rel.id_nino_responsable === relacionId
          ? { ...rel, parentescoDraft: valor }
          : rel
      )
    );
  };

  const guardarParentesco = async (rel) => {
    if (!rel?.id_nino_responsable || !rel?.nino?.id_nino) return;
    const nuevo = (rel.parentescoDraft || "").trim();
    const original = rel.parentesco ? rel.parentesco : "";
    if (nuevo === original) return;
    try {
      await axios.put(
        `http://localhost:5000/api/ninos/${rel.nino.id_nino}/responsables/${rel.id_nino_responsable}`,
        { parentesco: nuevo || null }
      );
      setNinosVinculados((prev) =>
        prev.map((item) =>
          item.id_nino_responsable === rel.id_nino_responsable
            ? { ...item, parentesco: nuevo || null, parentescoDraft: nuevo }
            : item
        )
      );
      Swal.fire({
        icon: "success",
        title: "Parentesco actualizado",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: "error", title: "No se pudo actualizar parentesco" });
      setNinosVinculados((prev) =>
        prev.map((item) =>
          item.id_nino_responsable === rel.id_nino_responsable
            ? { ...item, parentescoDraft: original }
            : item
        )
      );
    }
  };

  const quitarNino = async (rel) => {
    if (!rel?.id_nino_responsable || !rel?.nino?.id_nino) return;
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Quitar niño",
      text: "Esta relación se eliminará. ¿Continuar?",
      showCancelButton: true,
      confirmButtonText: "Sí, quitar",
      cancelButtonText: "Cancelar",
    });
    if (!confirm.isConfirmed) return;
    try {
      await axios.delete(
        `http://localhost:5000/api/ninos/${rel.nino.id_nino}/responsables/${rel.id_nino_responsable}`
      );
      setNinosVinculados((prev) =>
        prev.filter(
          (item) => item.id_nino_responsable !== rel.id_nino_responsable
        )
      );
      Swal.fire({
        icon: "success",
        title: "Relación eliminada",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: "error", title: "No se pudo eliminar la relación" });
    }
  };

  const vincularNino = async (nino) => {
    if (!modalData) return;
    const { value: formValues } = await Swal.fire({
      title: `Vincular a ${nino.nombre ?? "Niño"}`,
      html: `
        <div class="swal-form">
          <label for="parentesco-nino" class="swal2-label">Parentesco (opcional)</label>
          <input id="parentesco-nino" class="swal2-input" placeholder="Ej: hijo" />
          <label class="swal2-checkbox" style="justify-content:flex-start;gap:0.5rem;margin-top:0.5rem;">
            <input id="principal-nino" type="checkbox" />
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
          .getElementById("parentesco-nino")
          ?.value?.trim();
        const principalValue =
          document.getElementById("principal-nino")?.checked;
        return {
          parentesco: parentescoValue || "",
          esPrincipal: !!principalValue,
        };
      },
    });

    if (!formValues) return;

    try {
      await axios.post(
        `http://localhost:5000/api/ninos/${nino.id_nino}/responsables`,
        {
          id_responsable: modalData.id_responsable,
          parentesco: formValues.parentesco || null,
          es_principal: formValues.esPrincipal,
        }
      );
      await cargarNinosDeResponsable(modalData.id_responsable);
      setNinoResults((prev) =>
        prev.filter((item) => item.id_nino !== nino.id_nino)
      );
      Swal.fire({
        icon: "success",
        title: "Niño vinculado",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: "error",
        title: "No se pudo vincular",
        text: e?.response?.data?.message || "",
      });
    }
  };

  useEffect(() => {
    if (!modalOpen || !modalData) return;
    const term = debouncedNinoSearch.trim();
    if (term.length < 2) {
      setNinoResults([]);
      setNinoSearchLoading(false);
      return;
    }

    let cancelado = false;
    setNinoSearchLoading(true);
    axios
      .get("http://localhost:5000/api/ninos", {
        params: { search: term, page: 1, pageSize: 5, tipo: "todos" },
      })
      .then((res) => {
        if (cancelado) return;
        const data = res?.data?.data || [];
        const filtrados = data.filter(
          (nino) =>
            !ninosVinculados.some((rel) => rel.nino?.id_nino === nino.id_nino)
        );
        setNinoResults(filtrados);
      })
      .catch((e) => {
        if (cancelado) return;
        console.error("Error buscando niños:", e);
        setNinoResults([]);
      })
      .finally(() => {
        if (!cancelado) setNinoSearchLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [debouncedNinoSearch, modalOpen, modalData, ninosVinculados]);

  useEffect(() => {
    if (!modalOpen) {
      setNinoSearch("");
      setNinoResults([]);
    }
  }, [modalOpen]);

  const startEdit = (r) => {
    setEditId(r.id_responsable);
    setEditDraft({
      nombre: r.nombre || "",
      apellido: r.apellido || "",
      telefono: r.telefono || "",
      email: r.email || "",
      dni: r.dni || "",
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditDraft({});
  };

  const confirmEdit = async (id) => {
    try {
      const payload = {};
      ["nombre", "apellido", "telefono", "email", "dni"].forEach((k) => {
        if (editDraft[k] !== undefined) payload[k] = editDraft[k];
      });
      await axios.put(`http://localhost:5000/api/responsables/${id}`, payload);
      // update local state
      setItems((prev) =>
        prev.map((it) =>
          it.id_responsable === id ? { ...it, ...payload } : it
        )
      );
      cancelEdit();
      Swal.fire({
        icon: "success",
        title: "Actualizado",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: "error", title: "No se pudo actualizar" });
    }
  };

  const deleteResponsable = async (r) => {
    const res = await Swal.fire({
      icon: "warning",
      title: "Eliminar responsable",
      text: `Esto lo ocultará de los listados. ¿Continuar con ${r.nombre} ${r.apellido}?`,
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!res.isConfirmed) return;
    try {
      await axios.delete(
        `http://localhost:5000/api/responsables/${r.id_responsable}`
      );
      setItems((prev) =>
        prev.filter((it) => it.id_responsable !== r.id_responsable)
      );
      setTotal((t) => Math.max(0, t - 1));
      Swal.fire({
        icon: "success",
        title: "Eliminado",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: "error", title: "No se pudo eliminar" });
    }
  };

  return (
    <section className="ninos-page">
      <div className="ninos-top">
        <h1 className="ninos-title">Padres, Madres y Tutores</h1>
        <div className="ninos-controls">
          <form
            className="busqueda-form"
            onSubmit={handleBuscar}
            role="search"
            aria-label="Buscar responsables"
          >
            <label className="sr-only" htmlFor="buscar-resp">
              Buscar
            </label>
            <div className="search">
              <input
                id="buscar-resp"
                type="text"
                className="busqueda-input"
                placeholder="Buscar por nombre, apellido, email, teléfono o DNI"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </form>
          <div className="action-buttons" />
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
                aria-label="Lista de responsables"
              >
                <thead>
                  <tr>
                    <th className="col-dni">DNI</th>
                    <th className="col-name">Nombre completo</th>
                    <th>Teléfono</th>
                    <th>Email</th>
                    <th className="col-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => {
                    const isEditing = editId === r.id_responsable;
                    const nombreCompleto = `${r.nombre || ""} ${
                      r.apellido || ""
                    }`
                      .replace(/\s+/g, " ")
                      .trim();
                    const nombreDisplay =
                      nombreCompleto || r.nombre || r.apellido || "—";
                    return (
                      <tr key={r.id_responsable}>
                        <td className="col-dni" data-label="DNI">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editDraft.dni ?? ""}
                              onChange={(e) =>
                                setEditDraft((d) => ({
                                  ...d,
                                  dni: e.target.value,
                                }))
                              }
                              className="table-input"
                            />
                          ) : (
                            r.dni || "—"
                          )}
                        </td>
                        <td className="col-name" data-label="Nombre completo">
                          {isEditing ? (
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <input
                                type="text"
                                value={editDraft.nombre ?? ""}
                                onChange={(e) =>
                                  setEditDraft((d) => ({
                                    ...d,
                                    nombre: e.target.value,
                                  }))
                                }
                                className="table-input"
                                placeholder="Nombre"
                              />
                              <input
                                type="text"
                                value={editDraft.apellido ?? ""}
                                onChange={(e) =>
                                  setEditDraft((d) => ({
                                    ...d,
                                    apellido: e.target.value,
                                  }))
                                }
                                className="table-input"
                                placeholder="Apellido"
                              />
                            </div>
                          ) : (
                            nombreDisplay
                          )}
                        </td>
                        <td data-label="Teléfono">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editDraft.telefono ?? ""}
                              onChange={(e) =>
                                setEditDraft((d) => ({
                                  ...d,
                                  telefono: e.target.value,
                                }))
                              }
                              className="table-input"
                            />
                          ) : (
                            r.telefono || "—"
                          )}
                        </td>
                        <td data-label="Email">
                          {isEditing ? (
                            <input
                              type="email"
                              value={editDraft.email ?? ""}
                              onChange={(e) =>
                                setEditDraft((d) => ({
                                  ...d,
                                  email: e.target.value,
                                }))
                              }
                              className="table-input"
                            />
                          ) : (
                            r.email || "—"
                          )}
                        </td>
                        <td className="col-actions" data-label="Acciones">
                          <div className="row-actions">
                            {isEditing ? (
                              <>
                                <button
                                  className="icon-btn success"
                                  title="Guardar"
                                  onClick={() => confirmEdit(r.id_responsable)}
                                >
                                  <MdCheck size={20} />
                                </button>
                                <button
                                  className="icon-btn danger"
                                  title="Cancelar"
                                  onClick={cancelEdit}
                                >
                                  <MdClose size={20} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="icon-btn info"
                                  title="Niños asociados"
                                  onClick={() => abrirInfo(r)}
                                >
                                  <FaChild size={20} />
                                </button>
                                <button
                                  className="icon-btn edit"
                                  title="Editar"
                                  onClick={() => startEdit(r)}
                                >
                                  <MdEdit size={20} />
                                </button>

                                <button
                                  className="icon-btn danger"
                                  title="Eliminar"
                                  onClick={() => deleteResponsable(r)}
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
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-info" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              &times;
            </button>
            <h2>Niños a cargo</h2>

            <div className="modal-section">
              <h3>Responsable</h3>
              <div className="modal-row">
                <span>Nombre completo:</span>
                <strong>
                  {modalData.nombre} {modalData.apellido}
                </strong>
              </div>
              <div className="modal-row">
                <span>DNI:</span> {modalData.dni || "—"}
              </div>
              <div className="modal-row">
                <span>Contacto:</span>
                <span className="cell-stack">
                  {modalData.telefono || "—"}
                  <span className="muted-text">{modalData.email || "—"}</span>
                </span>
              </div>
            </div>

            <div className="modal-section">
              <h3>Niños asignados</h3>
              <p className="section-help">
                Controla qué niños están vinculados a este responsable. Puedes
                asignar nuevos niños con la búsqueda en tiempo real.
              </p>

              <div className="relationship-search">
                <label htmlFor="buscar-nino" className="sr-only">
                  Buscar niño
                </label>
                <input
                  id="buscar-nino"
                  type="text"
                  value={ninoSearch}
                  onChange={(e) => setNinoSearch(e.target.value)}
                  placeholder="Buscar niño por nombre, apellido o DNI"
                />
                {ninoSearchLoading && (
                  <div className="inline-loader">Buscando…</div>
                )}
                {!ninoSearchLoading && ninoResults.length > 0 && (
                  <ul className="search-results">
                    {ninoResults.map((nino) => (
                      <li key={nino.id_nino}>
                        <div className="result-info">
                          <strong>
                            {nino.nombre} {nino.apellido}
                          </strong>
                          <span>
                            DNI: {nino.dni || "—"} · {nino.tipo || "—"}
                          </span>
                        </div>
                        <button
                          className="btn small"
                          onClick={() => vincularNino(nino)}
                        >
                          <FaUserPlus size={14} /> Vincular
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {!ninoSearchLoading &&
                  ninoSearch.trim().length >= 2 &&
                  ninoResults.length === 0 && (
                    <div className="search-empty">
                      Sin coincidencias disponibles o ya vinculadas.
                    </div>
                  )}
              </div>

              <div className="relationship-list">
                {ninosLoading ? (
                  <div className="loader">Cargando niños…</div>
                ) : ninosError ? (
                  <div className="error">{ninosError}</div>
                ) : ninosVinculados.length === 0 ? (
                  <div className="empty">
                    No tiene niños asociados. Utiliza la búsqueda para vincular
                    uno existente.
                  </div>
                ) : (
                  <div className="dashboard-table-wrapper">
                    <table className="table" aria-label="Niños asociados">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>DNI</th>
                          <th>Parentesco</th>
                          <th>Principal</th>
                          <th>Fecha nacimiento</th>
                          <th>Tipo</th>
                          <th className="col-actions">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ninosVinculados.map((rel) => (
                          <tr
                            key={rel.id_nino_responsable}
                            className={rel.es_principal ? "row-principal" : ""}
                          >
                            <td data-label="Nombre">
                              <div className="cell-stack">
                                <span className="cell-strong">
                                  {rel.nino?.nombre || "—"}{" "}
                                  {rel.nino?.apellido || ""}
                                </span>
                                {rel.es_principal && (
                                  <span className="tag principal">
                                    <FaStar size={12} /> Principal
                                  </span>
                                )}
                              </div>
                            </td>
                            <td data-label="DNI">{rel.nino?.dni || "—"}</td>
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
                                placeholder="Ej: hijo"
                              />
                            </td>
                            <td data-label="Principal">
                              <label className="inline-check">
                                <input
                                  type="checkbox"
                                  checked={!!rel.es_principal}
                                  onChange={() => togglePrincipal(rel)}
                                  aria-label="Marcar como principal"
                                />
                                {rel.es_principal ? "Sí" : "No"}
                              </label>
                            </td>
                            <td data-label="Fecha nacimiento">
                              {rel.nino?.fecha_nacimiento
                                ? formatDateDMY(rel.nino.fecha_nacimiento)
                                : "—"}
                            </td>
                            <td data-label="Tipo">{rel.nino?.tipo || "—"}</td>
                            <td className="col-actions" data-label="Acciones">
                              <div className="row-actions">
                                <button
                                  className="icon-btn danger"
                                  title="Quitar niño"
                                  onClick={() => quitarNino(rel)}
                                >
                                  <FaUnlink size={18} />
                                </button>
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
    </section>
  );
}
