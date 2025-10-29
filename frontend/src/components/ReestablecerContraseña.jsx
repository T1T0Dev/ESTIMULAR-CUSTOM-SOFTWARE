import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import "../styles/ReestablecerContraseña.css";

const MIN_PASSWORD_LENGTH = 8;

export default function ReestablecerContraseña({
  open = false,
  miembro = null,
  onClose,
  onSuccess,
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setPassword("");
      setConfirmPassword("");
      setError("");
    }
  }, [open, miembro?.id_usuario]);

  const displayName = useMemo(() => {
    const nombre = miembro?.nombre || "";
    const apellido = miembro?.apellido || "";
    const full = `${nombre} ${apellido}`.trim();
    if (full) return full;
    if (miembro?.dni) return `DNI ${miembro.dni}`;
    return "Integrante";
  }, [miembro?.nombre, miembro?.apellido, miembro?.dni]);

  const dniText = useMemo(() => {
    if (!miembro?.dni) return null;
    return `DNI ${miembro.dni}`;
  }, [miembro?.dni]);

  if (!open) return null;

  const validatePassword = (pwd) => {
    if (!pwd || pwd.length < MIN_PASSWORD_LENGTH) {
      return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    }
    const forbidden =
      /('|--|;|\/\*|\*\/|xp_|exec|union|select|insert|delete|update|drop|alter|create|shutdown)/i;
    if (forbidden.test(pwd)) {
      return "La contraseña contiene caracteres no permitidos.";
    }
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (!miembro?.id_usuario) {
      setError("No hay un usuario válido seleccionado.");
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(
        `http://localhost:5000/api/equipo/${miembro.id_usuario}/reset-password`,
        {
          nuevaContrasena: password,
        }
      );
      Swal.fire({
        icon: "success",
        title: "Contraseña actualizada",
        timer: 1400,
        showConfirmButton: false,
      });
      onSuccess?.(miembro);
      onClose?.();
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "No se pudo restablecer la contraseña";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="resetpwd-overlay"
      role="presentation"
      onClick={() => {
        if (!submitting) onClose?.();
      }}
    >
      <div
        className="resetpwd-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="resetpwd-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="resetpwd-close"
          type="button"
          aria-label="Cerrar"
          onClick={() => {
            if (!submitting) onClose?.();
          }}
        >
          &times;
        </button>

        <h2 id="resetpwd-title" className="resetpwd-heading">
          Restablecer contraseña
        </h2>
        <p className="resetpwd-subheading">
          {displayName}
          {dniText ? <span className="resetpwd-dni">{dniText}</span> : null}
        </p>

        <form className="resetpwd-form" onSubmit={handleSubmit}>
          <label className="resetpwd-label" htmlFor="resetpwd-password">
            Nueva contraseña
          </label>
          <input
            id="resetpwd-password"
            type="password"
            className="resetpwd-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingresá la nueva contraseña"
            minLength={MIN_PASSWORD_LENGTH}
            required
            disabled={submitting}
            autoFocus
          />

          <label className="resetpwd-label" htmlFor="resetpwd-confirm">
            Confirmar contraseña
          </label>
          <input
            id="resetpwd-confirm"
            type="password"
            className="resetpwd-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repetí la contraseña"
            minLength={MIN_PASSWORD_LENGTH}
            required
            disabled={submitting}
          />

          {error ? <div className="resetpwd-error">{error}</div> : null}

          <div className="resetpwd-actions">
            <button
              type="button"
              className="resetpwd-btn outline"
              onClick={() => {
                if (!submitting) onClose?.();
              }}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="resetpwd-btn primary"
              disabled={submitting}
            >
              {submitting ? "Guardando..." : "Restablecer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
