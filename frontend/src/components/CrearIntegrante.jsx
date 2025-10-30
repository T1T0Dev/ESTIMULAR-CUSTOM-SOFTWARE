import { useCallback, useMemo, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../constants/api";
import Swal from "sweetalert2";
import "../styles/FormularioEntrevista.css";

export default function CrearIntegrante({ onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    email: "",
    fecha_nacimiento: "",
    foto_perfil: "",
    profesion: "",
    dni: "",
    contrasena: "",
    rol: "",
  });

  const actualizar = useCallback(
    (k, v) => setData((d) => ({ ...d, [k]: v })),
    []
  );

  const { fechaMinima, fechaMaxima } = useMemo(() => {
    const hoy = new Date();
    const max = new Date(hoy.getFullYear() - 18, hoy.getMonth(), hoy.getDate());
    const min = new Date(hoy.getFullYear() - 80, hoy.getMonth(), hoy.getDate());
    const f = (d) => d.toISOString().slice(0, 10);
    return { fechaMinima: f(min), fechaMaxima: f(max) };
  }, []);

  const validarStep = (s) => {
    if (s === 1) {
      if (!data.nombre || !data.apellido)
        return "Nombre y apellido obligatorios";
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
        return "Email inválido";
      return null;
    }
    if (s === 2) {
      if (!/^\d{7,15}$/.test(String(data.dni)))
        return "DNI inválido (7-15 dígitos)";
      if (!data.contrasena || data.contrasena.length < 8)
        return "Contraseña mínimo 8 caracteres";
      return null;
    }
    return null;
  };

  const siguiente = () => {
    const err = validarStep(step);
    if (err) {
      Swal.fire({ icon: "error", title: "Datos incompletos", text: err });
      return;
    }
    setStep((s) => Math.min(2, s + 1));
  };

  const anterior = () => setStep((s) => Math.max(1, s - 1));

  const guardar = async () => {
    const err = validarStep(2);
    if (err) {
      Swal.fire({ icon: "error", title: "Datos incompletos", text: err });
      return;
    }
    try {
      Swal.fire({
        title: "Guardando...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
  await axios.post(`${API_BASE_URL}/api/equipo`, data);
      Swal.close();
      Swal.fire({
        icon: "success",
        title: "Integrante creado",
        timer: 1200,
        showConfirmButton: false,
      });
      onCreated && onCreated();
    } catch (e) {
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "Error",
        text: e?.response?.data?.message || "No se pudo crear",
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-info" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          &times;
        </button>
        <h2>Nuevo integrante del equipo</h2>

        <div className="entrevista__progreso">
          <div className="entrevista__progreso-bar">
            <div
              className="entrevista__progreso-fill"
              style={{ width: `${(step / 2) * 100}%` }}
            />
          </div>
          <div className="entrevista__pasos-dots">
            {[1, 2].map((i) => (
              <button
                key={i}
                className={`paso-dot ${i <= step ? "activo" : ""}`}
                onClick={() => setStep(i)}
              />
            ))}
          </div>
        </div>

        <form className="entrevista__form" onSubmit={(e) => e.preventDefault()}>
          <fieldset>
            <legend>
              {step === 1 ? "Datos personales" : "Credenciales de acceso"}
            </legend>
            <div className="entrevista__contenido">
              {step === 1 ? (
                <>
                  <div className="field">
                    <label className="label-entrevista" htmlFor="foto_perfil">
                      Foto de perfil (URL)
                    </label>
                    <input
                      id="foto_perfil"
                      className="entrevista__input"
                      value={data.foto_perfil}
                      onChange={(e) =>
                        actualizar("foto_perfil", e.target.value)
                      }
                      placeholder="https://..."
                    />
                  </div>
                  <div className="field">
                    <label className="label-entrevista" htmlFor="nombre">
                      Nombre
                    </label>
                    <input
                      id="nombre"
                      className="entrevista__input"
                      value={data.nombre}
                      onChange={(e) => actualizar("nombre", e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="label-entrevista" htmlFor="apellido">
                      Apellido
                    </label>
                    <input
                      id="apellido"
                      className="entrevista__input"
                      value={data.apellido}
                      onChange={(e) => actualizar("apellido", e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="label-entrevista" htmlFor="email">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="entrevista__input"
                      value={data.email}
                      onChange={(e) => actualizar("email", e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label className="label-entrevista" htmlFor="telefono">
                      Teléfono
                    </label>
                    <input
                      id="telefono"
                      className="entrevista__input"
                      value={data.telefono}
                      onChange={(e) => actualizar("telefono", e.target.value)}
                    />
                  </div>
                  <div className="field entrevista__input-fecha">
                    <label
                      className="label-entrevista"
                      htmlFor="fecha_nacimiento"
                    >
                      Fecha de nacimiento
                    </label>
                    <input
                      id="fecha_nacimiento"
                      type="date"
                      min={fechaMinima}
                      max={fechaMaxima}
                      className="entrevista__input"
                      value={data.fecha_nacimiento}
                      onChange={(e) =>
                        actualizar("fecha_nacimiento", e.target.value)
                      }
                    />
                  </div>
                  <div className="field">
                    <label className="label-entrevista" htmlFor="profesion">
                      Profesión
                    </label>
                    <input
                      id="profesion"
                      className="entrevista__input"
                      value={data.profesion}
                      onChange={(e) => actualizar("profesion", e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="label-informacion-entrevista">
                    Con estos datos podrá iniciar sesión por el login del
                    sistema.
                  </div>
                  <div className="field">
                    <label className="label-entrevista" htmlFor="dni">
                      DNI
                    </label>
                    <input
                      id="dni"
                      className="entrevista__input"
                      value={data.dni}
                      onChange={(e) => actualizar("dni", e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="label-entrevista" htmlFor="contrasena">
                      Contraseña
                    </label>
                    <input
                      id="contrasena"
                      type="password"
                      className="entrevista__input"
                      value={data.contrasena}
                      onChange={(e) => actualizar("contrasena", e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="label-entrevista" htmlFor="rol">
                      Rol (opcional)
                    </label>
                    <input
                      id="rol"
                      className="entrevista__input"
                      value={data.rol}
                      onChange={(e) => actualizar("rol", e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </fieldset>

          <div className="entrevista__nav">
            <button
              className="btn-nav btn-outline"
              type="button"
              onClick={step === 1 ? onClose : anterior}
            >
              {" "}
              {step === 1 ? "Cancelar" : "Anterior"}{" "}
            </button>
            {step === 1 ? (
              <button className="btn-nav" type="button" onClick={siguiente}>
                Siguiente
              </button>
            ) : (
              <button className="btn-nav" type="button" onClick={guardar}>
                Crear
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
