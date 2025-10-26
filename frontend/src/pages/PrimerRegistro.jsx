import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Login.css";
import useAuthStore from "../store/useAuthStore";

export default function PrimerRegistro() {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    fecha_nacimiento: "",
    profesion: "",
    nuevaContrasena: "",
    confirmacion: "",
  });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { token, profile, updateProfile, setNeedsProfile } = useAuthStore(
    (state) => ({
      token: state.token,
      profile: state.profile,
      updateProfile: state.updateProfile,
      setNeedsProfile: state.setNeedsProfile,
    })
  );

  useEffect(() => {
    if (profile) {
      setForm((prev) => ({
        ...prev,
        nombre: profile.nombre || "",
        apellido: profile.apellido || "",
        telefono: profile.telefono || "",
        fecha_nacimiento: profile.fecha_nacimiento || "",
        profesion: profile.profesion || "",
      }));
    }
  }, [profile]);

  useEffect(() => {
    if (!useAuthStore.persist.hasHydrated()) return;
    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [token, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setOk("");
    if (!form.nombre || !form.apellido || !form.telefono) {
      setError("Completá nombre, apellido y teléfono");
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
    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/api/login/primer-registro",
        {
          nombre: form.nombre,
          apellido: form.apellido,
          telefono: form.telefono,
          fecha_nacimiento: form.fecha_nacimiento,
          profesion: form.profesion || null,
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
          <div className="brand-logo">E</div>
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

          <div className="grid-2">
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
            <div>
              <label>Profesión</label>
              <input
                value={form.profesion}
                onChange={(e) =>
                  setForm({ ...form, profesion: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid-2">
            <div>
              <label>Nueva contraseña</label>
              <input
                type="password"
                value={form.nuevaContrasena}
                onChange={(e) =>
                  setForm({ ...form, nuevaContrasena: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label>Confirmar contraseña</label>
              <input
                type="password"
                value={form.confirmacion}
                onChange={(e) =>
                  setForm({ ...form, confirmacion: e.target.value })
                }
                required
              />
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
