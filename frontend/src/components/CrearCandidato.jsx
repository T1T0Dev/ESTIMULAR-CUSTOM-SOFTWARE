import { useState, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../constants/api";
import Swal from "sweetalert2";
import "../styles/CrearCandidato.css";

export default function CrearCandidato({
  onClose,
  onCreated,
  obrasSociales = [],
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [candidato, setCandidato] = useState({
    nombre_nino: "",
    apellido_nino: "",
    dni_nino: "",
    fecha_nacimiento: "",
    certificado_discapacidad: false,
    id_obra_social: "",
    obra_social_texto: "",
    motivo_consulta: "",
  });

  const [responsable, setResponsable] = useState({
    nombre_responsable: "",
    apellido_responsable: "",
    telefono: "",
    email: "",
    parentesco: "",
    es_principal: true,
    dni: "",
  });

  const [foundResponsable, setFoundResponsable] = useState(null);

  // auto lookup DNI with debounce
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
            nombre_responsable: r.nombre || prev.nombre_responsable,
            apellido_responsable: r.apellido || prev.apellido_responsable,
            telefono: r.telefono || prev.telefono,
            email: r.email || prev.email,
          }));
          Swal.fire({
            icon: "info",
            title: "Responsable existente",
            text: "Responsable encontrado. Puede continuar.",
            timer: 1400,
            showConfirmButton: false,
          });
        } else {
          setFoundResponsable(null);
          Swal.fire({
            icon: "warning",
            title: "Responsable no registrado",
            text: "No se encontró ese DNI. Complete los campos del responsable.",
            timer: 1600,
            showConfirmButton: false,
          });
        }
      } catch (err) {
        console.warn("Error buscando responsable por DNI", err?.message || err);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [responsable.dni]);

  const validarPaso1 = () => {
    if (!candidato.nombre_nino.trim())
      return "El nombre del niño es obligatorio";
    if (!candidato.apellido_nino.trim())
      return "El apellido del niño es obligatorio";
    if (!candidato.dni_nino.trim()) return "El DNI del niño es obligatorio";
    return null;
  };

  const handleSubmit = async () => {
    setError(null);
    const v = validarPaso1();
    if (v) return Swal.fire({ icon: "error", title: "Faltan datos", text: v });
    if (!responsable.dni || responsable.dni.trim().length === 0)
      return Swal.fire({
        icon: "warning",
        title: "DNI requerido",
        text: "Debe ingresar el DNI del responsable (sin puntos ni espacios).",
      });

    setLoading(true);
    try {
      const payload = {
        candidato: {
          nombre_nino: candidato.nombre_nino,
          apellido_nino: candidato.apellido_nino,
          dni_nino: candidato.dni_nino,
          fecha_nacimiento: candidato.fecha_nacimiento || null,
          certificado_discapacidad: !!candidato.certificado_discapacidad,
          id_obra_social: candidato.id_obra_social || null,
          obra_social_texto: candidato.obra_social_texto || null,
          motivo_consulta: candidato.motivo_consulta || null,
        },
        responsable: {
          nombre_responsable:
            foundResponsable?.nombre || responsable.nombre_responsable,
          apellido_responsable:
            foundResponsable?.apellido || responsable.apellido_responsable,
          telefono: foundResponsable?.telefono || responsable.telefono || null,
          email: foundResponsable?.email || responsable.email || null,
          parentesco: responsable.parentesco || null,
          es_principal: true,
          dni: responsable.dni || null,
        },
      };

      const res = await axios.post(
        `${API_BASE_URL}/api/entrevista/crear-candidato`,
        payload
      );
      if (res?.data?.success) {
        Swal.fire({
          icon: "success",
          title: "Creado",
          text: "Candidato creado correctamente",
          timer: 1400,
          showConfirmButton: false,
        });
        onCreated && onCreated(res.data.data);
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: res?.data?.message || "No se pudo crear el candidato",
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
        <h2>Agregar candidato</h2>

        {error && <div className="crear-error">{error}</div>}

        {step === 1 && (
          <div className="crear-step">
            <h3>Datos del niño</h3>
            <div className="form-row">
              <label>
                Nombre
                <input
                  className="input-wide"
                  value={candidato.nombre_nino}
                  onChange={(e) =>
                    setCandidato({ ...candidato, nombre_nino: e.target.value })
                  }
                  type="text"
                />
              </label>
              <label>
                Apellido
                <input
                  className="input-wide"
                  value={candidato.apellido_nino}
                  onChange={(e) =>
                    setCandidato({
                      ...candidato,
                      apellido_nino: e.target.value,
                    })
                  }
                  type="text"
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                DNI
                <input
                  className="input-small"
                  value={candidato.dni_nino}
                  onChange={(e) =>
                    setCandidato({ ...candidato, dni_nino: e.target.value })
                  }
                  type="text"
                />
              </label>
              <label>
                Fecha de nacimiento
                <input
                  className="input-small"
                  value={candidato.fecha_nacimiento}
                  onChange={(e) =>
                    setCandidato({
                      ...candidato,
                      fecha_nacimiento: e.target.value,
                    })
                  }
                  type="date"
                />
              </label>
            </div>

            <label>
              Certificado discapacidad
              <select
                value={candidato.certificado_discapacidad ? "si" : "no"}
                onChange={(e) =>
                  setCandidato({
                    ...candidato,
                    certificado_discapacidad: e.target.value === "si",
                  })
                }
              >
                <option value="no">NO</option>
                <option value="si">SI</option>
              </select>
            </label>

            <label>
              Obra social (seleccionar)
              <select
                value={candidato.id_obra_social || ""}
                onChange={(e) =>
                  setCandidato({
                    ...candidato,
                    id_obra_social: e.target.value || "",
                  })
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
                value={candidato.obra_social_texto}
                onChange={(e) =>
                  setCandidato({
                    ...candidato,
                    obra_social_texto: e.target.value,
                  })
                }
                type="text"
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
                  type="text"
                  placeholder="Ej: 44028630"
                />
              </label>
            </div>

            {foundResponsable ? (
              <div className="found-box">
                <strong>Responsable existente:</strong>
                <div>
                  {foundResponsable.nombre} {foundResponsable.apellido}
                </div>
                <div>
                  {foundResponsable.email || "—"} •{" "}
                  {foundResponsable.telefono || "—"}
                </div>
                <div className="muted">
                  Se usará este responsable para la creación.
                </div>
              </div>
            ) : (
              <>
                <div className="form-row">
                  <label>
                    Nombre responsable
                    <input
                      className="input-wide"
                      value={responsable.nombre_responsable}
                      onChange={(e) =>
                        setResponsable({
                          ...responsable,
                          nombre_responsable: e.target.value,
                        })
                      }
                      type="text"
                    />
                  </label>
                  <label>
                    Apellido responsable
                    <input
                      className="input-wide"
                      value={responsable.apellido_responsable}
                      onChange={(e) =>
                        setResponsable({
                          ...responsable,
                          apellido_responsable: e.target.value,
                        })
                      }
                      type="text"
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
                      type="text"
                    />
                  </label>
                  <label>
                    Email
                    <input
                      className="input-small"
                      value={responsable.email}
                      onChange={(e) =>
                        setResponsable({
                          ...responsable,
                          email: e.target.value,
                        })
                      }
                      type="email"
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
                type="text"
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
                {loading ? "Creando..." : "Crear candidato"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
