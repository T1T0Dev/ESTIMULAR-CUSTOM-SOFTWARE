import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logoEstimular from "../assets/logo_estimular.png";
import { IoEyeOff, IoEye } from "react-icons/io5";
import useAuthStore from "../store/useAuthStore";

import "../styles/Login.css";

export default function Login() {
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{7,15}$/.test(dni)) {
      setError("DNI inválido");
      return;
    }
    if (!password) {
      setError("Ingresá tu contraseña");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/login/login", {
        dni,
        contrasena: password,
      });
      const { token, user, profile, firstLogin, needsProfile } = res.data || {};
      if (token) {
        setAuth({ token, user, profile, needsProfile });
      }
      if (firstLogin || needsProfile) {
        navigate("/primer-registro");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          "No se pudo iniciar sesión. Intenta nuevamente."
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
            Si quieres ir rápido camina <span>solo</span> si quieres llegar
            lejos camina <span>acompañado</span>.
          </h1>
          <p>
            Plataforma de gestión para profesionales. Acceso seguro a turnos,
            historias y seguimiento.
          </p>
        </div>
        <div className="left-footer">
          © Estimular {new Date().getFullYear()}
        </div>
      </div>

      <div className="login-right">
        <form className="login-card" onSubmit={onSubmit}>
          <h2>Iniciar sesión</h2>
          <p className="subtitle">Bienvenid@ al sistema de Estimular</p>

          {error ? <div className="alert-error">{error}</div> : null}

          <label htmlFor="dni">DNI</label>
          <input
            id="dni"
            type="text"
            inputMode="numeric"
            placeholder="Ingresa tu DNI"
            value={dni}
            onChange={(e) => setDni(e.target.value.replace(/[^0-9]/g, ""))}
            required
          />

          <label htmlFor="password">Contraseña</label>
          <div className="password-field">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="toggle-visibility"
              aria-label={
                showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
              }
              onClick={() => setShowPassword((s) => !s)}
            >
              {showPassword ? <IoEyeOff size={20} /> : <IoEye size={20} />}
            </button>
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Ingresando…" : "Ingresar"}
          </button>

          <p className="help-note">
            ¿Olvidaste tu contraseña? Consultá a las encargadas para que puedan
            proporcionarte tu acceso.
          </p>
          <div className="secure-note">Acceso cifrado y verificado</div>
        </form>
      </div>
    </div>
  );
}
