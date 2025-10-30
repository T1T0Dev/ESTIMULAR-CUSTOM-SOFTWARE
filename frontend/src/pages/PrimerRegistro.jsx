import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Login.css";
import useAuthStore from "../store/useAuthStore";
import { IoEye, IoEyeOff } from "react-icons/io5";
import logoEstimular from "../assets/logo_estimular.png";
import API_BASE_URL from "../constants/api";

export default function PrimerRegistro() {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    fecha_nacimiento: "",
    email: "",
    tipoUsuario: "profesional",
    profesionId: "",
    fotoFile: null,
    fotoPreview: "",
    nuevaContrasena: "",
    confirmacion: "",
  });
  const [profesiones, setProfesiones] = useState([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const profile = useAuthStore((state) => state.profile);
  const needsProfile = useAuthStore((state) => state.needsProfile);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const setNeedsProfile = useAuthStore((state) => state.setNeedsProfile);

  useEffect(() => {
    if (profile) {
      setForm((prev) => ({
        ...prev,
        nombre: profile.nombre || "",
        apellido: profile.apellido || "",
        telefono: profile.telefono || "",
        fecha_nacimiento:
          (profile.fecha_nacimiento
            ? String(profile.fecha_nacimiento).slice(0, 10)
            : "") || "",
        email: profile.email || "",
        tipoUsuario: profile.tipo || "profesional",
        profesionId:
          profile.departamento_id ||
          profile.departamento?.id_departamento ||
          "",
      }));
    }
  }, [profile]);

  // Cargar profesiones para el selector
  useEffect(() => {
    (async () => {
      try {
  const res = await axios.get(`${API_BASE_URL}/api/profesiones`);
        setProfesiones(res?.data?.data || []);
      } catch (e) {
        console.error("No se pudieron cargar profesiones", e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!useAuthStore.persist.hasHydrated()) return;
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    if (!needsProfile) {
      navigate("/dashboard", { replace: true });
    }
  }, [token, needsProfile, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setOk("");
    if (!form.nombre || !form.apellido || !form.telefono) {
      setError("Completá nombre, apellido y teléfono");
      return;
    }
    if (!form.email) {
      setError("Ingresá tu email");
      return;
    }
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(form.email)) {
      setError("Ingresá un email válido");
      return;
    }
    if (!form.fecha_nacimiento) {
      setError("Seleccioná tu fecha de nacimiento");
      return;
    }
    if (!form.nuevaContrasena || form.nuevaContrasena !== form.confirmacion) {
      setError("La nueva contraseña no coincide");
      return;
    }
    if (form.nuevaContrasena.trim().toLowerCase() === "estimular_2025") {
      setError("Debes elegir una contraseña distinta a la genérica");
      return;
    }
    if (
      form.tipoUsuario === "profesional" &&
      (!form.profesionId || Number.isNaN(Number(form.profesionId)))
    ) {
      setError("Seleccioná tu profesión");
      return;
    }
    setLoading(true);
    try {
      const seleccion =
        form.tipoUsuario === "secretario"
          ? "secretario"
          : form.profesionId
          ? Number(form.profesionId)
          : null;
      const response = await axios.post(
        `${API_BASE_URL}/api/login/primer-registro`,
        {
          nombre: form.nombre,
          apellido: form.apellido,
          telefono: form.telefono,
          fecha_nacimiento: form.fecha_nacimiento,
          email: form.email,
          tipoUsuario: form.tipoUsuario,
          profesionId:
            form.tipoUsuario === "profesional"
              ? Number(form.profesionId)
              : null,
          seleccion,
          foto_perfil: form.fotoPreview || null,
          nuevaContrasena: form.nuevaContrasena,
        }
      );
      if (response?.data?.profile) {
        updateProfile(response.data.profile);
        setNeedsProfile(false);
      }
      setOk("Datos guardados. Redirigiendo…");
      setTimeout(() => navigate("/dashboard"), 900);
    } catch (err) {
      setError(
        err?.response?.data?.error || "No se pudo guardar, intenta nuevamente"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="login-left">
        <div className="brand">
          <div className="brand-logo">
            <img src={logoEstimular} alt="Logo Estimular" />
          </div>
          <div className="brand-text">
            <h3>ESTIMULAR</h3>
            <p>Centro Terapéutico</p>
          </div>
        </div>
        <div className="left-content">
          <h1>
            Bienvenido, completá tu <span>perfil</span>
          </h1>
          <p>Estos datos son necesarios para comenzar a usar el sistema.</p>
        </div>
        <div className="left-footer">© Estimular 2025</div>
      </div>

      <div className="login-right">
        <form className="login-card" onSubmit={onSubmit}>
          <h2>Primer registro</h2>
          <p className="subtitle">
            Completá tus datos y definí una nueva contraseña
          </p>
          {error ? <div className="alert-error">{error}</div> : null}
          {ok ? <div className="alert-ok">{ok}</div> : null}

          <div className="grid-2">
            <div>
              <label>Nombre</label>
              <input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
              />
            </div>
            <div>
              <label>Apellido</label>
              <input
                value={form.apellido}
                onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                required
              />
            </div>
          </div>

          <label>Teléfono</label>
          <input
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            required
          />

          <label>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />

          <div className="grid-2">
            <div>
              <label>Tipo de usuario</label>
              <select
                value={form.tipoUsuario}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    tipoUsuario: e.target.value,
                    profesionId:
                      e.target.value === "profesional" ? prev.profesionId : "",
                  }))
                }
              >
                <option value="profesional">Profesional</option>
                <option value="secretario">Secretario/a</option>
              </select>
            </div>
            {form.tipoUsuario === "profesional" ? (
              <div>
                <label>Profesión</label>
                <select
                  value={form.profesionId}
                  onChange={(e) =>
                    setForm({ ...form, profesionId: e.target.value })
                  }
                  required={form.tipoUsuario === "profesional"}
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
              <div>
                <label style={{ visibility: "hidden" }}>Profesión</label>
                <input
                  type="text"
                  disabled
                  value="Secretaría"
                  style={{ opacity: 0.6 }}
                />
              </div>
            )}
          </div>

          <div className="grid-2">
            <div>
              <label>Foto de perfil</label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0] || null;
                  if (!file) {
                    setForm((prev) => ({
                      ...prev,
                      fotoFile: null,
                      fotoPreview: "",
                    }));
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    setForm((prev) => ({
                      ...prev,
                      fotoFile: file,
                      fotoPreview: String(reader.result || ""),
                    }));
                  };
                  reader.readAsDataURL(file);
                }}
              />
              {form.fotoPreview ? (
                <div style={{ marginTop: 8 }}>
                  <img
                    src={form.fotoPreview}
                    alt="Vista previa"
                    style={{
                      width: 72,
                      height: 72,
                      objectFit: "cover",
                      borderRadius: 8,
                    }}
                  />
                </div>
              ) : null}
            </div>
            <div>
              <label>Fecha de nacimiento</label>
              <input
                type="date"
                value={form.fecha_nacimiento}
                onChange={(e) =>
                  setForm({ ...form, fecha_nacimiento: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="grid-2">
            <div>
              <label>Nueva contraseña</label>
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.nuevaContrasena}
                  onChange={(e) =>
                    setForm({ ...form, nuevaContrasena: e.target.value })
                  }
                  required
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <IoEyeOff size={20} /> : <IoEye size={20} />}
                </button>
              </div>
            </div>
            <div>
              <label>Confirmar contraseña</label>
              <div className="password-field">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={form.confirmacion}
                  onChange={(e) =>
                    setForm({ ...form, confirmacion: e.target.value })
                  }
                  required
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  aria-label={
                    showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  onClick={() => setShowConfirm((prev) => !prev)}
                >
                  {showConfirm ? <IoEyeOff size={20} /> : <IoEye size={20} />}
                </button>
              </div>
            </div>
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Guardando…" : "Guardar y continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}
