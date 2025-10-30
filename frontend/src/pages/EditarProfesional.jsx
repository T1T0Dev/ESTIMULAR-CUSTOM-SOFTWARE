import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import useAuthStore from "../store/useAuthStore";
import "../styles/EditarProfesional.css";
import API_BASE_URL from "../constants/api";

const initialState = {
  nombre: "",
  apellido: "",
  telefono: "",
  email: "",
  fecha_nacimiento: "",
  profesionId: "",
  dni: "",
  nuevaContrasena: "",
  confirmarContrasena: "",
};

const normalizeString = (value) =>
  value === null || value === undefined ? "" : String(value);

function dataURLFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result ?? null);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export default function EditarProfesional() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const updateUser = useAuthStore((s) => s.updateUser);
  const setUser = useAuthStore((s) => s.setUser);
  const setNeedsProfile = useAuthStore((s) => s.setNeedsProfile);
  const [form, setForm] = useState(initialState);
  const [profesiones, setProfesiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fotoPreview, setFotoPreview] = useState("");
  const [fotoData, setFotoData] = useState(null);
  const [removeFoto, setRemoveFoto] = useState(false);

  const isProfesional = useMemo(() => {
    if (profile?.tipo) return profile.tipo === "profesional";
    if (user?.roles?.length) {
      return user.roles.some((r) =>
        String(r?.nombre || "")
          .toLowerCase()
          .includes("profes")
      );
    }
    return false;
  }, [profile?.tipo, user?.roles]);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    async function hydrate() {
      try {
        const [profRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/profesiones`),
        ]);
        setProfesiones(profRes?.data?.data || []);
      } catch (err) {
        console.error("No se pudieron cargar las profesiones", err);
      } finally {
        setLoading(false);
      }
    }

    hydrate();
  }, [navigate, token]);

  useEffect(() => {
    if (!profile) return;
    setForm({
      nombre: normalizeString(profile.nombre),
      apellido: normalizeString(profile.apellido),
      telefono: normalizeString(profile.telefono),
      email: normalizeString(profile.email),
      fecha_nacimiento: profile.fecha_nacimiento
        ? normalizeString(profile.fecha_nacimiento).slice(0, 10)
        : "",
      profesionId: normalizeString(
        profile.departamento_id || profile.departamento?.id_departamento
      ),
      dni: normalizeString(user?.dni ?? ""),
      nuevaContrasena: "",
      confirmarContrasena: "",
    });
    setFotoPreview(profile.foto_perfil || "");
    setFotoData(null);
    setRemoveFoto(false);
  }, [profile, user?.dni]);

  const onFieldChange = useCallback((field, transform) => {
    return (event) => {
      const value = transform
        ? transform(event.target.value)
        : event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };
  }, []);

  const onFileChange = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        setFotoData(null);
        setRemoveFoto(false);
        if (!profile?.foto_perfil) {
          setFotoPreview("");
        }
        return;
      }
      if (file.size > 3 * 1024 * 1024) {
        Swal.fire({
          icon: "warning",
          title: "Archivo demasiado grande",
          text: "La imagen debe pesar menos de 3MB.",
        });
        return;
      }
      try {
        const dataUrl = await dataURLFromFile(file);
        if (typeof dataUrl === "string") {
          setFotoPreview(dataUrl);
          setFotoData(dataUrl);
          setRemoveFoto(false);
        }
      } catch (err) {
        console.error("Error leyendo archivo", err);
        Swal.fire({
          icon: "error",
          title: "No se pudo leer la imagen",
        });
      }
    },
    [profile?.foto_perfil]
  );

  const onRemovePhoto = useCallback(() => {
    setFotoPreview("");
    setFotoData(null);
    setRemoveFoto(true);
  }, []);

  const validate = useCallback(() => {
    const nombre = normalizeString(form.nombre).trim();
    const apellido = normalizeString(form.apellido).trim();
    const telefono = normalizeString(form.telefono).trim();
    const email = normalizeString(form.email).trim();
    const dni = normalizeString(form.dni).trim();
    const nuevaPwd = normalizeString(form.nuevaContrasena).trim();
    const confirmPwd = normalizeString(form.confirmarContrasena).trim();
    if (!nombre) return "Ingresá tu nombre";
    if (!apellido) return "Ingresá tu apellido";
    if (!telefono) return "Ingresá tu teléfono";
    if (!email) return "Ingresá tu email";
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) return "Email inválido";
    if (!dni) return "Ingresá tu DNI";
    if (!/^\d{7,15}$/.test(dni)) return "DNI inválido (7-15 dígitos)";
    if (isProfesional) {
      if (!normalizeString(form.fecha_nacimiento).trim())
        return "La fecha de nacimiento es obligatoria";
      const profesionIdStr = normalizeString(form.profesionId).trim();
      if (!profesionIdStr || Number.isNaN(Number(profesionIdStr))) {
        return "Seleccioná tu profesión";
      }
    }
    if (nuevaPwd || confirmPwd) {
      if (nuevaPwd.length < 8) {
        return "La nueva contraseña debe tener al menos 8 caracteres";
      }
      if (nuevaPwd.toLowerCase() === "estimular_2025") {
        return "Elegí una contraseña distinta a la genérica";
      }
      if (nuevaPwd !== confirmPwd) {
        return "Las contraseñas no coinciden";
      }
      const forbidden =
        /('|--|;|\/\*|\*\/|xp_|exec|union|select|insert|delete|update|drop|alter|create|shutdown)/i;
      if (forbidden.test(nuevaPwd)) {
        return "La contraseña contiene caracteres no permitidos";
      }
    }
    const fechaNacimientoValue = normalizeString(form.fecha_nacimiento).trim();
    if (fechaNacimientoValue) {
      const d = new Date(fechaNacimientoValue);
      if (Number.isNaN(d.getTime())) {
        return "Fecha de nacimiento inválida";
      }
    }
    return null;
  }, [form, isProfesional]);

  const onSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      const validationError = validate();
      if (validationError) {
        Swal.fire({ icon: "warning", title: validationError });
        return;
      }

      const payload = {
        nombre: normalizeString(form.nombre).trim(),
        apellido: normalizeString(form.apellido).trim(),
        telefono: normalizeString(form.telefono).trim(),
        email: normalizeString(form.email).trim(),
        fecha_nacimiento: normalizeString(form.fecha_nacimiento).trim() || null,
        tipoUsuario: profile?.tipo || undefined,
        dni: Number(normalizeString(form.dni).trim()),
      };

      if (isProfesional) {
        const profesionIdStr = normalizeString(form.profesionId).trim();
        payload.profesionId = profesionIdStr ? Number(profesionIdStr) : null;
      }

      if (normalizeString(form.nuevaContrasena).trim()) {
        payload.nuevaContrasena = normalizeString(form.nuevaContrasena).trim();
      }

      if (fotoData) {
        payload.foto_perfil = fotoData;
      } else if (removeFoto) {
        payload.removeFoto = true;
      }

      setSaving(true);
      try {
        Swal.fire({
          title: "Guardando…",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        const { data } = await axios.put(
          `${API_BASE_URL}/api/login/perfil`,
          payload
        );

        if (data?.profile) {
          if (typeof updateProfile === "function") {
            updateProfile(data.profile);
          } else if (typeof setProfile === "function") {
            setProfile(data.profile);
          }
        }
        if (data?.user) {
          if (typeof setUser === "function") {
            setUser(data.user);
          } else if (typeof updateUser === "function") {
            updateUser(data.user);
          }
        }

        if (typeof setNeedsProfile === "function") {
          setNeedsProfile(false);
        }

        Swal.fire({
          icon: "success",
          title: "Perfil actualizado",
          timer: 1400,
          showConfirmButton: false,
        });
        setFotoData(null);
        setRemoveFoto(false);
        setForm((prev) => ({
          ...prev,
          nuevaContrasena: "",
          confirmarContrasena: "",
        }));
      } catch (err) {
        console.error("Error actualizando perfil", err);
        Swal.fire({
          icon: "error",
          title: "No se pudo guardar",
          text:
            err?.response?.data?.error ||
            "Ocurrió un error al actualizar tus datos",
        });
      } finally {
        setSaving(false);
      }
    },
    [
      form,
      isProfesional,
      profile?.tipo,
      fotoData,
      removeFoto,
      updateProfile,
      setProfile,
      setUser,
      updateUser,
      setNeedsProfile,
      validate,
    ]
  );

  if (!token) return null;

  return (
    <section className="editar-profesional">
      <header className="editar-profesional__header">
        <div>
          <h1>Editar mi perfil</h1>
          <p>
            Actualizá tu información de contacto y la foto que se mostrará en el
            equipo de Estimular.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigate(-1)}
        >
          Volver
        </button>
      </header>

      <div className="form-photo">
        <div>
          <label htmlFor="foto_perfil">Foto de perfil</label>
          <p className="help-text">
            Se mostrará en el listado de profesionales y secretaría.
          </p>
          <input
            id="foto_perfil"
            type="file"
            accept="image/*"
            onChange={onFileChange}
          />
          <div className="form-photo__actions">
            <button
              type="button"
              className="btn-link"
              onClick={() => document.getElementById("foto_perfil")?.click()}
            >
              Seleccionar nueva foto
            </button>
            {(fotoPreview || profile?.foto_perfil) && (
              <button
                type="button"
                className="btn-link danger"
                onClick={onRemovePhoto}
              >
                Quitar foto
              </button>
            )}
          </div>
        </div>
        <div className="form-photo__preview">
          {fotoPreview ? (
            <img src={fotoPreview} alt="Vista previa" />
          ) : profile?.foto_perfil && !removeFoto ? (
            <img src={profile.foto_perfil} alt="Foto actual" />
          ) : (
            <div className="placeholder-avatar">
              {`${(form.nombre?.[0] || "U").toUpperCase()}${(
                form.apellido?.[0] || "S"
              ).toUpperCase()}`}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="editar-profesional__loading">Cargando…</div>
      ) : (
        <form className="editar-profesional__form" onSubmit={onSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="nombre">Nombre</label>
              <input
                id="nombre"
                value={form.nombre}
                onChange={onFieldChange("nombre")}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="apellido">Apellido</label>
              <input
                id="apellido"
                value={form.apellido}
                onChange={onFieldChange("apellido")}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="telefono">Teléfono</label>
              <input
                id="telefono"
                value={form.telefono}
                onChange={onFieldChange("telefono")}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={onFieldChange("email")}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="dni">DNI</label>
              <input
                id="dni"
                value={form.dni}
                onChange={onFieldChange("dni")}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="fecha_nacimiento">Fecha de nacimiento</label>
              <input
                id="fecha_nacimiento"
                type="date"
                value={form.fecha_nacimiento}
                onChange={onFieldChange("fecha_nacimiento")}
                required={isProfesional}
              />
            </div>

            {isProfesional ? (
              <div className="form-group">
                <label htmlFor="profesion">Profesión / Departamento</label>
                <select
                  id="profesion"
                  value={form.profesionId}
                  onChange={onFieldChange("profesionId")}
                  required
                >
                  <option value="">— Seleccionar —</option>
                  {profesiones.map((p) => (
                    <option key={p.id_departamento} value={p.id_departamento}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label>Rol</label>
                <input
                  value={user?.rol_nombre || "Secretaría"}
                  disabled
                  className="readonly"
                />
              </div>
            )}
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="nuevaContrasena">Nueva contraseña</label>
              <input
                id="nuevaContrasena"
                type="password"
                value={form.nuevaContrasena}
                onChange={onFieldChange("nuevaContrasena")}
                autoComplete="new-password"
                placeholder="Dejar en blanco para mantener la actual"
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmarContrasena">Confirmar contraseña</label>
              <input
                id="confirmarContrasena"
                type="password"
                value={form.confirmarContrasena}
                onChange={onFieldChange("confirmarContrasena")}
                autoComplete="new-password"
              />
            </div>
          </div>

          <footer className="form-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(-1)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </footer>
        </form>
      )}
    </section>
  );
}
