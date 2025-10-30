import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
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
  secretario: "SECRETARIO",
  admin: "ADMIN",
};

const ROLE_LABEL = {
  profesional: "Profesional",
  secretario: "Secretaría",
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
  const [step, setStep] = useState(1);
  const [data, setData] = useState(initialData);
  const [profesiones, setProfesiones] = useState([]);
  const [cargandoProfesiones, setCargandoProfesiones] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fotoPreview, setFotoPreview] = useState("");
  const [fotoData, setFotoData] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    const fetchProfesiones = async () => {
      try {
        setCargandoProfesiones(true);
        const { data: response } = await axios.get(
          "http://localhost:5000/api/profesiones"
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
        const tipoNext = valor === "secretario" ? "secretario" : "profesional";
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

  const validarStep = useCallback(
    (indice) => {
      if (indice === 1) {
        if (!normalize(data.nombre)) return "Ingresá el nombre";
        if (!normalize(data.apellido)) return "Ingresá el apellido";
        if (!normalize(data.fecha_nacimiento)) {
          return "Seleccioná la fecha de nacimiento";
        }
        if (data.email && !emailRegex.test(normalize(data.email))) {
          return "Correo electrónico inválido";
        }
        if (data.tipo === "profesional") {
          if (cargandoProfesiones) {
            return "Esperá a que carguen las profesiones";
          }
          if (!normalize(data.profesionId)) {
            return "Seleccioná la profesión/departamento";
          }
        }
        return null;
      }
      if (indice === 2) {
        if (!/^\d{7,15}$/.test(normalize(data.dni))) {
          return "DNI inválido (7-15 dígitos)";
        }
        if (!normalize(data.contrasena) || data.contrasena.length < 8) {
          return "La contraseña debe tener al menos 8 caracteres";
        }
        if (
          normalize(data.contrasena) !== normalize(data.confirmarContrasena)
        ) {
          return "Las contraseñas no coinciden";
        }
        return null;
      }
      return null;
    },
    [cargandoProfesiones, data]
  );

  const mostrarError = useCallback((mensaje) => {
    Swal.fire({ icon: "error", title: "Revisá los datos", text: mensaje });
  }, []);

  const siguiente = useCallback(() => {
    const err = validarStep(step);
    if (err) {
      mostrarError(err);
      return;
    }
    setStep((prev) => Math.min(2, prev + 1));
  }, [mostrarError, step, validarStep]);

  const anterior = useCallback(() => {
    setStep((prev) => Math.max(1, prev - 1));
  }, []);

  const handleGuardar = useCallback(async () => {
    const err = validarStep(2);
    if (err) {
      mostrarError(err);
      return;
    }

    const payload = {
      tipo: data.tipo === "secretario" ? "secretario" : "profesional",
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
      payload.profesionId = Number(data.profesionId);
    }

    try {
      setSaving(true);
      Swal.fire({
        title: "Guardando...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      await axios.post("http://localhost:5000/api/equipo", payload);
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
      setStep(1);
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
    validarStep,
  ]);

  const handleOverlayClick = useCallback(() => {
    if (saving) return;
    if (onClose) onClose();
  }, [onClose, saving]);
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

        <div className="integrante-progress">
          <div className="integrante-progress__bar">
            <div
              className="integrante-progress__fill"
              style={{ width: `${(step / 2) * 100}%` }}
            />
          </div>
          <div className="integrante-progress__steps">
            {[1, 2].map((i) => (
              <button
                key={i}
                type="button"
                className={`integrante-progress__dot ${
                  i <= step ? "integrante-progress__dot--active" : ""
                }`}
                onClick={() => setStep(i)}
              />
            ))}
          </div>
        </div>

        <form className="integrante-form" onSubmit={(e) => e.preventDefault()}>
          <fieldset className="integrante-form__fieldset">
            <legend className="integrante-form__legend">
              {step === 1 ? "Datos personales" : "Credenciales de acceso"}
            </legend>
            <div className="integrante-form__body">
              {step === 1 ? (
                <>
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
                        required
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
                        required
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
                          data.tipo === "secretario"
                            ? "integrante-option--active"
                            : ""
                        }`}
                        onClick={() => actualizar("tipo", "secretario")}
                      >
                        Secretaría
                      </button>
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

                  <div className="integrante-field">
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
                    <p className="integrante-helper">
                      Podés combinar el acceso administrador con el rol
                      profesional para que aparezca en su departamento y tenga
                      permisos completos.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="integrante-note">
                    Con estos datos podrá iniciar sesión por el login del
                    sistema.
                  </div>
                  <div className="integrante-summary">
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
                  <div className="integrante-grid integrante-grid--credentials">
                    <div className="integrante-field">
                      <label className="integrante-label" htmlFor="dni">
                        DNI
                      </label>
                      <input
                        id="dni"
                        className="integrante-input"
                        value={data.dni}
                        onChange={(e) => actualizar("dni", e.target.value)}
                        required
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
                        onChange={(e) =>
                          actualizar("contrasena", e.target.value)
                        }
                        required
                        placeholder="Mínimo 8 caracteres"
                      />
                    </div>
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
                        required
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </fieldset>

          <div className="integrante-actions">
            <button
              className="integrante-btn integrante-btn--secondary"
              type="button"
              onClick={step === 1 ? handleOverlayClick : anterior}
              disabled={saving}
            >
              {step === 1 ? "Cancelar" : "Anterior"}
            </button>
            {step === 1 ? (
              <button
                className="integrante-btn"
                type="button"
                onClick={siguiente}
                disabled={saving}
              >
                Siguiente
              </button>
            ) : (
              <button
                className="integrante-btn"
                type="button"
                onClick={handleGuardar}
                disabled={saving}
              >
                {saving ? "Guardando…" : "Crear"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
