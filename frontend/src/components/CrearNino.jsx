import { useEffect, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../constants/api";
import Swal from "sweetalert2";
import "../styles/CrearNino.css";

export default function CrearNino({ onClose, onCreated, obrasSociales = [] }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [foundResponsable, setFoundResponsable] = useState(null);

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    fecha_nacimiento: "",
    certificado_discapacidad: false,
    id_obra_social: "",
    obra_social_texto: "",
    tipo: "candidato",
  });

  const [responsable, setResponsable] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    email: "",
    parentesco: "",
    dni: "",
  });

  useEffect(() => {
    setFoundResponsable(null);
    if (!responsable.dni || responsable.dni.trim().length === 0) return;
    const t = setTimeout(async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/responsables?dni=${responsable.dni}`
        );
        const items = res?.data?.data || [];
        if (items.length > 0) {
          const r = items[0];
          setFoundResponsable(r);
          setResponsable((prev) => ({
            ...prev,
            nombre: r.nombre || prev.nombre,
            apellido: r.apellido || prev.apellido,
            telefono: r.telefono || prev.telefono,
            email: r.email || prev.email,
          }));
          Swal.fire({
            icon: "info",
            title: "Responsable existente",
            timer: 1200,
            showConfirmButton: false,
          });
        } else {
          setFoundResponsable(null);
        }
      } catch {
        // ignore lookup errors
      }
    }, 600);
    return () => clearTimeout(t);
  }, [responsable.dni]);

  const validarPaso1 = () => {
    if (!form.nombre.trim()) return "El nombre del niño es obligatorio";
    if (!form.apellido.trim()) return "El apellido del niño es obligatorio";
    return null;
  };

  const handleSubmit = async () => {
    const v = validarPaso1();
    if (v) return Swal.fire({ icon: "error", title: "Faltan datos", text: v });
    if (!responsable.dni)
      return Swal.fire({
        icon: "warning",
        title: "DNI requerido",
        text: "Ingrese DNI del responsable",
      });
    setLoading(true);
    try {
      const payload = {
        nombre: form.nombre,
        apellido: form.apellido,
        dni: form.dni || null,
        fecha_nacimiento: form.fecha_nacimiento || null,
        certificado_discapacidad: !!form.certificado_discapacidad,
        id_obra_social: form.id_obra_social || null,
        obra_social_texto: form.obra_social_texto || null,
        tipo: form.tipo,
        responsable: {
          nombre: foundResponsable?.nombre || responsable.nombre,
          apellido: foundResponsable?.apellido || responsable.apellido,
          telefono: foundResponsable?.telefono || responsable.telefono || null,
          email: foundResponsable?.email || responsable.email || null,
          parentesco: responsable.parentesco || null,
          dni: responsable.dni || null,
        },
      };
  const res = await axios.post(`${API_BASE_URL}/api/ninos`, payload);
      if (res?.data?.success) {
        Swal.fire({
          icon: "success",
          title: "Creado",
          timer: 1200,
          showConfirmButton: false,
        });
        onCreated && onCreated(res.data.data);
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: res?.data?.message || "No se pudo crear",
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          err?.response?.data?.message ||
          err?.message ||
          "Error en el servidor",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="crear-overlay" onClick={() => onClose && onClose()}>
      <div
        className="crear-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <button className="crear-close" onClick={() => onClose && onClose()}>
          &times;
        </button>
        <h2>Agregar niño</h2>

        {step === 1 && (
          <div className="crear-step">
            <h3>Datos del niño</h3>
            <div className="form-row">
              <label>
                Nombre
                <input
                  className="input-wide"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </label>
              <label>
                Apellido
                <input
                  className="input-wide"
                  value={form.apellido}
                  onChange={(e) =>
                    setForm({ ...form, apellido: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="foNrm-row">
              <label>
                DNI
                <input
                  className="input-small"
                  value={form.dni}
                  onChange={(e) => setForm({ ...form, dni: e.target.value })}
                />
              </label>
              <label>
                Fecha de nacimiento
                <input
                  className="input-small"
                  type="date"
                  value={form.fecha_nacimiento}
                  onChange={(e) =>
                    setForm({ ...form, fecha_nacimiento: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Certificado discapacidad
                <select
                  value={form.certificado_discapacidad ? "si" : "no"}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      certificado_discapacidad: e.target.value === "si",
                    })
                  }
                >
                  <option value="no">NO</option>
                  <option value="si">SI</option>
                </select>
              </label>
              <label>
                Tipo
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                >
                  <option value="candidato">candidato</option>
                  <option value="paciente">paciente</option>
                </select>
              </label>
            </div>
            <label>
              Obra social (seleccionar)
              <select
                value={form.id_obra_social || ""}
                onChange={(e) =>
                  setForm({ ...form, id_obra_social: e.target.value || "" })
                }
              >
                <option value="">-- Seleccionar obra social --</option>
                {obrasSociales.map((o) => (
                  <option key={o.id_obra_social} value={o.id_obra_social}>
                    {o.nombre_obra_social}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Obra social (texto libre)
              <input
                value={form.obra_social_texto}
                onChange={(e) =>
                  setForm({ ...form, obra_social_texto: e.target.value })
                }
                placeholder="Si no está en la lista, escribe el nombre"
              />
            </label>
            <div className="crear-actions">
              <button
                className="btn outline"
                onClick={() => onClose && onClose()}
                disabled={loading}
              >
                Cancelar
              </button>
              <button className="btn primary" onClick={() => setStep(2)}>
                Siguiente
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="crear-step">
            <h3>Responsable</h3>
            <p className="muted">
              Ingrese el DNI del responsable (sin puntos ni espacios). Si
              existe, se autocompletará.
            </p>
            <div className="form-row">
              <label>
                DNI responsable
                <input
                  className="input-small"
                  value={responsable.dni}
                  onChange={(e) =>
                    setResponsable({
                      ...responsable,
                      dni: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  placeholder="Ej: 44028630"
                />
              </label>
            </div>
            {!foundResponsable && (
              <>
                <div className="form-row">
                  <label>
                    Nombre
                    <input
                      className="input-wide"
                      value={responsable.nombre}
                      onChange={(e) =>
                        setResponsable({
                          ...responsable,
                          nombre: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Apellido
                    <input
                      className="input-wide"
                      value={responsable.apellido}
                      onChange={(e) =>
                        setResponsable({
                          ...responsable,
                          apellido: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    Teléfono
                    <input
                      className="input-small"
                      value={responsable.telefono}
                      onChange={(e) =>
                        setResponsable({
                          ...responsable,
                          telefono: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Email
                    <input
                      className="input-small"
                      type="email"
                      value={responsable.email}
                      onChange={(e) =>
                        setResponsable({
                          ...responsable,
                          email: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              </>
            )}
            <label>
              Parentesco
              <input
                value={responsable.parentesco}
                onChange={(e) =>
                  setResponsable({ ...responsable, parentesco: e.target.value })
                }
              />
            </label>
            <div className="crear-actions">
              <button
                className="btn outline"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Atrás
              </button>
              <button
                className="btn primary"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "Creando..." : "Crear niño"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
