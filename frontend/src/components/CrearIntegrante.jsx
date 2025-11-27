import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../constants/api";
import Swal from "sweetalert2";
import "../styles/CrearIntegrante.css";

const initialData = {
  nombre: "",
  apellido: "",
  telefono: "",
  email: "",
  fecha_nacimiento: "",
  foto_perfil: "",
  tipo: "profesional",
  profesionId: "",
  dni: "",
  contrasena: "",
  confirmarContrasena: "",
  esAdmin: false,
};

const ROLE_API_NAME = {
  profesional: "PROFESIONAL",
  recepcion: "RECEPCION",
  admin: "ADMIN",
};

const ROLE_LABEL = {
  profesional: "Profesional",
  recepcion: "Recepción",
  admin: "Admin",
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalize = (value) => (value == null ? "" : String(value).trim());

function dataURLFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result ?? null);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export default function CrearIntegrante({ onClose, onCreated }) {
  const [data, setData] = useState(initialData);
  const [profesiones, setProfesiones] = useState([]);
  const [cargandoProfesiones, setCargandoProfesiones] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fotoPreview, setFotoPreview] = useState("");
  const [fotoData, setFotoData] = useState(null);
  const [mostrarDetalles, setMostrarDetalles] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    const fetchProfesiones = async () => {
      try {
        setCargandoProfesiones(true);
        const { data: response } = await axios.get(
          `${API_BASE_URL}/api/profesiones`
        );
        if (!active) return;
        const listado = Array.isArray(response?.data) ? response.data : [];
        setProfesiones(listado);
      } catch (error) {
        console.error("No se pudieron cargar las profesiones", error);
        if (active) setProfesiones([]);
      } finally {
        if (active) setCargandoProfesiones(false);
      }
    };

    fetchProfesiones();
    return () => {
      active = false;
    };
  }, []);

  const actualizar = useCallback((clave, valor) => {
    setData((prev) => {
      if (clave === "tipo") {
        const tipoNext = valor === "recepcion" ? "recepcion" : "profesional";
        return {
          ...prev,
          tipo: tipoNext,
          profesionId: tipoNext === "profesional" ? prev.profesionId : "",
        };
      }
      return { ...prev, [clave]: valor };
    });
  }, []);

  const toggleAdmin = useCallback(() => {
    setData((prev) => ({ ...prev, esAdmin: !prev.esAdmin }));
  }, []);

  const toggleDetalles = useCallback(() => {
    setMostrarDetalles((prev) => !prev);
  }, [setMostrarDetalles]);

  const onFileChange = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setFotoPreview("");
      setFotoData(null);
      setData((prev) => ({ ...prev, foto_perfil: "" }));
      return;
    }
    if (!file.type.startsWith("image/")) {
      Swal.fire({
        icon: "warning",
        title: "Formato no soportado",
        text: "Subí una imagen en formato PNG o JPG.",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      Swal.fire({
        icon: "warning",
        title: "Archivo demasiado grande",
        text: "La imagen debe pesar menos de 3MB.",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    try {
      const dataUrl = await dataURLFromFile(file);
      if (typeof dataUrl === "string") {
        setFotoPreview(dataUrl);
        setFotoData(dataUrl);
        setData((prev) => ({ ...prev, foto_perfil: dataUrl }));
      }
    } catch (error) {
      console.error("No se pudo leer la imagen", error);
      Swal.fire({
        icon: "error",
        title: "No se pudo leer la imagen",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  const onRemovePhoto = useCallback(() => {
    setFotoPreview("");
    setFotoData(null);
    setData((prev) => ({ ...prev, foto_perfil: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const { fechaMinima, fechaMaxima } = useMemo(() => {
    const hoy = new Date();
    const max = new Date(hoy.getFullYear() - 18, hoy.getMonth(), hoy.getDate());
    const min = new Date(hoy.getFullYear() - 80, hoy.getMonth(), hoy.getDate());
    const toIso = (d) => d.toISOString().slice(0, 10);
    return { fechaMinima: toIso(min), fechaMaxima: toIso(max) };
  }, []);

  const profesionSeleccionada = useMemo(() => {
    if (!data.profesionId) return null;
    return profesiones.find((prof) => {
      const id = prof?.id_departamento ?? prof?.departamento_id ?? prof?.id;
      return String(id) === String(data.profesionId);
    });
  }, [data.profesionId, profesiones]);

  const rolBase = ROLE_API_NAME[data.tipo] ?? ROLE_API_NAME.profesional;

  const rolesParaAsignar = useMemo(() => {
    const conjunto = new Set();
    conjunto.add(rolBase);
    if (data.esAdmin) {
      conjunto.add(ROLE_API_NAME.admin);
    }
    return Array.from(conjunto);
  }, [data.esAdmin, rolBase]);

  const rolesResumen = useMemo(() => {
    const resumen = [ROLE_LABEL[data.tipo] ?? ROLE_LABEL.profesional];
    if (data.esAdmin) resumen.push(ROLE_LABEL.admin);
    return resumen;
  }, [data.esAdmin, data.tipo]);

  const validarCampos = useCallback(() => {
    const dniNormalizado = normalize(data.dni);
    if (!/^\d{7,15}$/.test(dniNormalizado)) {
      return "DNI inválido (7-15 dígitos)";
    }

    const contrasenaNormalizada = normalize(data.contrasena);
    if (!contrasenaNormalizada || contrasenaNormalizada.length < 8) {
      return "La contraseña debe tener al menos 8 caracteres";
    }

    if (!mostrarDetalles) {
      return null;
    }

    const confirmarNormalizada = normalize(data.confirmarContrasena);
    const nombreNormalizado = normalize(data.nombre);
    const apellidoNormalizado = normalize(data.apellido);
    const fechaNormalizada = normalize(data.fecha_nacimiento);
    const profesionNormalizada = normalize(data.profesionId);

    if (!nombreNormalizado) return "Ingresá el nombre";
    if (!apellidoNormalizado) return "Ingresá el apellido";
    if (!fechaNormalizada) {
      return "Seleccioná la fecha de nacimiento";
    }

    if (data.email && !emailRegex.test(normalize(data.email))) {
      return "Correo electrónico inválido";
    }

    if (!confirmarNormalizada) {
      return "Confirmá la contraseña";
    }
    if (confirmarNormalizada !== contrasenaNormalizada) {
      return "Las contraseñas no coinciden";
    }

    if (data.tipo === "profesional") {
      if (cargandoProfesiones) {
        return "Esperá a que carguen las profesiones";
      }
      if (!profesionNormalizada) {
        return "Seleccioná la profesión/departamento";
      }
    }

    return null;
  }, [cargandoProfesiones, data, mostrarDetalles]);

  const mostrarError = useCallback((mensaje) => {
    Swal.fire({ icon: "error", title: "Revisá los datos", text: mensaje });
  }, []);

  const handleGuardar = useCallback(async () => {
    const err = validarCampos();
    if (err) {
      mostrarError(err);
      return;
    }

    const payload = {
      tipo: data.tipo === "recepcion" ? "recepcion" : "profesional",
      nombre: normalize(data.nombre),
      apellido: normalize(data.apellido),
      telefono: normalize(data.telefono) || null,
      email: normalize(data.email) || null,
      fecha_nacimiento: normalize(data.fecha_nacimiento) || null,
      dni: Number(normalize(data.dni)),
      contrasena: data.contrasena,
      rolesSeleccionados: rolesParaAsignar,
      rolNombre: rolBase,
      es_admin: data.esAdmin,
    };

    if (fotoData) {
      payload.foto_perfil = fotoData;
    }
    if (payload.email === "") payload.email = null;
    if (payload.telefono === "") payload.telefono = null;

    if (payload.tipo === "profesional") {
      const profesionNormalizada = normalize(data.profesionId);
      if (profesionNormalizada) {
        const profesionParsed = Number(profesionNormalizada);
        if (!Number.isNaN(profesionParsed)) {
          payload.profesionId = profesionParsed;
        }
      }
    }

    try {
      setSaving(true);
      Swal.fire({
        title: "Guardando...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
  await axios.post(`${API_BASE_URL}/api/equipo`, payload);
      Swal.close();
      Swal.fire({
        icon: "success",
        title: "Integrante creado",
        timer: 1400,
        showConfirmButton: false,
      });
      setData({ ...initialData });
      setFotoPreview("");
      setFotoData(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setMostrarDetalles(false);
      if (onCreated) onCreated();
    } catch (error) {
      Swal.close();
      const message =
        error?.response?.data?.message || "No se pudo crear el integrante";
      Swal.fire({ icon: "error", title: "Error", text: message });
    } finally {
      setSaving(false);
    }
  }, [
    data,
    fotoData,
    mostrarError,
    onCreated,
    rolBase,
    rolesParaAsignar,
    setMostrarDetalles,
    validarCampos,
  ]);

  const handleOverlayClick = useCallback(() => {
    if (saving) return;
    setMostrarDetalles(false);
    if (onClose) onClose();
  }, [onClose, saving, setMostrarDetalles]);
  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div
        className="modal-info integrante-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={handleOverlayClick}>
          &times;
        </button>
        <h2 className="integrante-modal__title">Nuevo integrante del equipo</h2>

        <form className="integrante-form" onSubmit={(e) => e.preventDefault()}>
          <fieldset className="integrante-form__fieldset">
            <legend className="integrante-form__legend">
              Acceso inicial
            </legend>
            <div className="integrante-form__body">
              <div className="integrante-grid integrante-grid--credentials">
                <div className="integrante-field">
                  <label className="integrante-label" htmlFor="dni">
                    DNI / Usuario
                  </label>
                  <input
                    id="dni"
                    className="integrante-input"
                    value={data.dni}
                    onChange={(e) => actualizar("dni", e.target.value)}
                    placeholder="Ej: 30123456"
                  />
                </div>
                <div className="integrante-field">
                  <label className="integrante-label" htmlFor="contrasena">
                    Contraseña
                  </label>
                  <input
                    id="contrasena"
                    type="password"
                    className="integrante-input"
                    value={data.contrasena}
                    onChange={(e) => actualizar("contrasena", e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
                {mostrarDetalles && (
                  <div className="integrante-field">
                    <label
                      className="integrante-label"
                      htmlFor="confirmarContrasena"
                    >
                      Confirmar contraseña
                    </label>
                    <input
                      id="confirmarContrasena"
                      type="password"
                      className="integrante-input"
                      value={data.confirmarContrasena}
                      onChange={(e) =>
                        actualizar("confirmarContrasena", e.target.value)
                      }
                    />
                  </div>
                )}
              </div>

              <div className="integrante-grid integrante-grid--roles">
                <div className="integrante-field">
                  <span className="integrante-label integrante-label--inline">
                    Tipo de integrante
                  </span>
                  <div className="integrante-options">
                    <button
                      type="button"
                      className={`integrante-option ${
                        data.tipo === "profesional"
                          ? "integrante-option--active"
                          : ""
                      }`}
                      onClick={() => actualizar("tipo", "profesional")}
                    >
                      Profesional
                    </button>
                    <button
                      type="button"
                      className={`integrante-option ${
                        data.tipo === "recepcion"
                          ? "integrante-option--active"
                          : ""
                      }`}
                      onClick={() => actualizar("tipo", "recepcion")}
                    >
                      Recepción
                    </button>
                  </div>
                </div>

                <div className="integrante-field integrante-field--permisos">
                  <span className="integrante-label integrante-label--inline">
                    Permisos adicionales
                  </span>
                  <div className="integrante-options">
                    <button
                      type="button"
                      className={`integrante-option ${
                        data.esAdmin ? "integrante-option--active" : ""
                      }`}
                      onClick={toggleAdmin}
                    >
                      Administrador
                    </button>
                  </div>
                </div>
              </div>

              <p className="integrante-helper integrante-helper--roles">
                Podés combinar el acceso administrador con el rol profesional para que aparezca en su
                departamento y tenga permisos completos.
              </p>
              <div className="integrante-summary integrante-summary--left integrante-summary--roles">
                {rolesResumen.map((rol) => (
                  <span key={rol} className="integrante-chip">
                    {rol}
                  </span>
                ))}
                {profesionSeleccionada && (
                  <span className="integrante-chip integrante-chip--neutral">
                    {profesionSeleccionada?.nombre}
                  </span>
                )}
              </div>

              <button
                type="button"
                className="integrante-toggle-btn"
                onClick={toggleDetalles}
                aria-expanded={mostrarDetalles}
              >
                {mostrarDetalles
                  ? "Solo cargar credenciales"
                  : "Cargar todos los datos"}
              </button>

              {mostrarDetalles && (
                <>
                  <div className="integrante-divider" aria-hidden="true" />
                  <div className="integrante-note">
                    Completá los datos personales y profesionales del
                    integrante.
                  </div>

                  <div className="integrante-photo-section">
                    <div className="integrante-photo-preview">
                      {fotoPreview ? (
                        <img src={fotoPreview} alt="Vista previa" />
                      ) : (
                        <div className="integrante-photo-placeholder">
                          {`${(data.nombre?.[0] || "U").toUpperCase()}${(
                            data.apellido?.[0] || "S"
                          ).toUpperCase()}`}
                        </div>
                      )}
                    </div>
                    <div className="integrante-photo-details">
                      <label className="integrante-label" htmlFor="foto_perfil">
                        Foto de perfil
                      </label>
                      <p className="integrante-helper">
                        Subí una imagen PNG o JPG de hasta 3MB para mostrarla en
                        el listado.
                      </p>
                      <div className="integrante-photo-actions">
                        <input
                          ref={fileInputRef}
                          id="foto_perfil"
                          type="file"
                          accept="image/*"
                          className="integrante-photo-input"
                          onChange={onFileChange}
                        />
                        <button
                          type="button"
                          className="integrante-photo-btn"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Seleccionar imagen
                        </button>
                        {fotoPreview && (
                          <button
                            type="button"
                            className="integrante-photo-btn integrante-photo-btn--secondary"
                            onClick={onRemovePhoto}
                          >
                            Quitar foto
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="integrante-grid integrante-grid--info">
                    <div className="integrante-field">
                      <label className="integrante-label" htmlFor="nombre">
                        Nombre
                      </label>
                      <input
                        id="nombre"
                        className="integrante-input"
                        value={data.nombre}
                        onChange={(e) => actualizar("nombre", e.target.value)}
                      />
                    </div>
                    <div className="integrante-field">
                      <label className="integrante-label" htmlFor="apellido">
                        Apellido
                      </label>
                      <input
                        id="apellido"
                        className="integrante-input"
                        value={data.apellido}
                        onChange={(e) => actualizar("apellido", e.target.value)}
                      />
                    </div>
                    <div className="integrante-field">
                      <label className="integrante-label" htmlFor="email">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        className="integrante-input"
                        value={data.email}
                        onChange={(e) => actualizar("email", e.target.value)}
                        placeholder="nombre@estimular.com"
                      />
                    </div>
                    <div className="integrante-field">
                      <label className="integrante-label" htmlFor="telefono">
                        Teléfono
                      </label>
                      <input
                        id="telefono"
                        className="integrante-input"
                        value={data.telefono}
                        onChange={(e) => actualizar("telefono", e.target.value)}
                        placeholder="Ej: 1123456789"
                      />
                    </div>
                    <div className="integrante-field">
                      <label
                        className="integrante-label"
                        htmlFor="fecha_nacimiento"
                      >
                        Fecha de nacimiento
                      </label>
                      <input
                        id="fecha_nacimiento"
                        type="date"
                        min={fechaMinima}
                        max={fechaMaxima}
                        className="integrante-input"
                        value={data.fecha_nacimiento}
                        onChange={(e) =>
                          actualizar("fecha_nacimiento", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  {data.tipo === "profesional" && (
                    <div className="integrante-field">
                      <label className="integrante-label" htmlFor="profesionId">
                        Departamento / Profesión
                      </label>
                      <select
                        id="profesionId"
                        className="integrante-input"
                        value={data.profesionId}
                        onChange={(e) =>
                          actualizar("profesionId", e.target.value)
                        }
                        disabled={cargandoProfesiones}
                      >
                        <option value="">— Seleccionar —</option>
                        {profesiones.map((prof) => {
                          const id =
                            prof?.id_departamento ??
                            prof?.departamento_id ??
                            prof?.id;
                          return (
                            <option key={id} value={id}>
                              {prof?.nombre || "Sin nombre"}
                            </option>
                          );
                        })}
                      </select>
                      {cargandoProfesiones && (
                        <p className="integrante-helper">
                          Cargando profesiones…
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </fieldset>

          <div className="integrante-actions">
            <button
              className="integrante-btn integrante-btn--secondary"
              type="button"
              onClick={handleOverlayClick}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              className="integrante-btn"
              type="button"
              onClick={handleGuardar}
              disabled={saving}
            >
              {saving ? "Guardando…" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
