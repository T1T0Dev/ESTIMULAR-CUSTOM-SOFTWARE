import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import "../styles/CrearResponsable.css";

const initialResponsable = {
  nombre: "",
  apellido: "",
  dni: "",
  telefono: "",
  email: "",
  direccion: "",
};

export default function CrearResponsable({ onClose, onCreated, ninos = [] }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [responsable, setResponsable] = useState(initialResponsable);
  const [selectedNinos, setSelectedNinos] = useState([]);
  const [lookupMemo, setLookupMemo] = useState({ dni: null, status: null });
  const [existing, setExisting] = useState(null);

  const sortedNinos = useMemo(
    () =>
      [...ninos].sort((a, b) => {
        const na = `${a.apellido || ""} ${a.nombre || ""}`.trim();
        const nb = `${b.apellido || ""} ${b.nombre || ""}`.trim();
        return na.localeCompare(nb);
      }),
    [ninos]
  );

  useEffect(() => {
    const dni = (responsable.dni || "").trim();
    if (!dni) {
      setExisting(null);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const { data } = await axios.get(
          `http://localhost:5000/api/responsables?dni=${dni}`
        );
        const items = data?.data || [];
        if (items.length > 0) {
          const record = items[0];
          setExisting(record);
          setResponsable((prev) => ({
            ...prev,
            nombre: record.nombre || prev.nombre,
            apellido: record.apellido || prev.apellido,
            telefono: record.telefono || prev.telefono,
            email: record.email || prev.email,
            direccion: record.direccion || prev.direccion,
          }));
          if (lookupMemo.dni !== dni || lookupMemo.status !== "existing") {
            Swal.fire({
              icon: "info",
              title: "Responsable existente",
              text: "Se reutilizará la persona encontrada.",
              timer: 1500,
              showConfirmButton: false,
            });
            setLookupMemo({ dni, status: "existing" });
          }
          if (Array.isArray(record.ninos)) {
            setSelectedNinos(record.ninos.map((item) => item.id_nino));
          }
        } else {
          setExisting(null);
          setSelectedNinos([]);
          if (lookupMemo.dni !== dni || lookupMemo.status !== "missing") {
            Swal.fire({
              icon: "warning",
              title: "No registrado",
              text: "No se encontró un responsable con ese DNI.",
              timer: 1500,
              showConfirmButton: false,
            });
            setLookupMemo({ dni, status: "missing" });
          }
        }
      } catch (err) {
        console.warn("Error buscando responsable", err?.message || err);
      }
    }, 600);

    return () => clearTimeout(timeout);
  }, [responsable.dni, lookupMemo]);

  const validateStep1 = () => {
    if (!responsable.dni.trim()) {
      return "El DNI es obligatorio";
    }
    if (!responsable.nombre.trim()) {
      return "El nombre es obligatorio";
    }
    if (!responsable.apellido.trim()) {
      return "El apellido es obligatorio";
    }
    return null;
  };

  const toggleNino = (id) => {
    setSelectedNinos((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    const validation = validateStep1();
    if (validation) {
      return Swal.fire({ icon: "error", title: "Faltan datos", text: validation });
    }

    if (selectedNinos.length === 0) {
      const confirm = await Swal.fire({
        icon: "question",
        title: "Sin niños asociados",
        text: "¿Quieres continuar sin asignar niños por ahora?",
        showCancelButton: true,
        confirmButtonText: "Sí, continuar",
        cancelButtonText: "Volver",
      });
      if (!confirm.isConfirmed) {
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        nombre: responsable.nombre,
        apellido: responsable.apellido,
        dni: responsable.dni,
        telefono: responsable.telefono || null,
        email: responsable.email || null,
        direccion: responsable.direccion || null,
        ninos_ids: selectedNinos,
      };

      const res = await axios.post("http://localhost:5000/api/responsables", payload);
      if (res?.data?.success) {
        Swal.fire({
          icon: "success",
          title: "Responsable guardado",
          timer: 1400,
          showConfirmButton: false,
        });
        onCreated?.(res.data.data);
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: res?.data?.message || "No se pudo guardar",
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

  const close = () => {
    onClose?.();
    setTimeout(() => {
      setStep(1);
      setLoading(false);
      setResponsable(initialResponsable);
      setSelectedNinos([]);
      setExisting(null);
      setLookupMemo({ dni: null, status: null });
    }, 220);
  };

  return (
    <div className="crear-overlay" onClick={close}>
      <div
        className="crear-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button className="crear-close" onClick={close}>
          &times;
        </button>
        <h2>{existing ? "Actualizar responsable" : "Crear responsable"}</h2>

        {step === 1 && (
          <div className="crear-step">
            <h3>Datos del responsable</h3>
            <div className="form-row">
              <label>
                DNI
                <input
                  value={responsable.dni}
                  onChange={(e) =>
                    setResponsable({ ...responsable, dni: e.target.value.replace(/\D/g, "") })
                  }
                  type="text"
                  placeholder="Ej: 40123456"
                />
              </label>
              <label>
                Teléfono
                <input
                  value={responsable.telefono}
                  onChange={(e) => setResponsable({ ...responsable, telefono: e.target.value })}
                  type="tel"
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Nombre
                <input
                  value={responsable.nombre}
                  onChange={(e) => setResponsable({ ...responsable, nombre: e.target.value })}
                  type="text"
                />
              </label>
              <label>
                Apellido
                <input
                  value={responsable.apellido}
                  onChange={(e) =>
                    setResponsable({ ...responsable, apellido: e.target.value })
                  }
                  type="text"
                />
              </label>
            </div>
            <label>
              Email
              <input
                value={responsable.email}
                onChange={(e) => setResponsable({ ...responsable, email: e.target.value })}
                type="email"
              />
            </label>
            <label>
              Dirección
              <input
                value={responsable.direccion}
                onChange={(e) =>
                  setResponsable({ ...responsable, direccion: e.target.value })
                }
                type="text"
              />
            </label>
            <div className="crear-actions">
              <button className="btn outline" onClick={close} disabled={loading}>
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
            <h3>Asociar niños</h3>
            {sortedNinos.length === 0 ? (
              <p className="muted">No hay niños disponibles para asociar.</p>
            ) : (
              <div className="ninos-grid">
                {sortedNinos.map((nino) => {
                  const id = nino.id_nino ?? nino.id ?? nino.uuid;
                  if (!id) {
                    return null;
                  }
                  const label = `${nino.apellido || ""} ${nino.nombre || ""}`.trim();
                  return (
                    <label key={id} className="nino-card">
                      <input
                        type="checkbox"
                        checked={selectedNinos.includes(id)}
                        onChange={() => toggleNino(id)}
                      />
                      <span>{label || `Niño ${id}`}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <div className="crear-actions">
              <button
                className="btn outline"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Atrás
              </button>
              <button className="btn primary" onClick={handleSubmit} disabled={loading}>
                {loading ? "Guardando..." : existing ? "Actualizar" : "Crear"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

