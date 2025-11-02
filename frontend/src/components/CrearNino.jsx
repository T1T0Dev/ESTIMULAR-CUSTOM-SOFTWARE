import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import "../styles/CrearNino.css";

const initialNino = {
  nombre: "",
  apellido: "",
  dni: "",
  fecha_nacimiento: "",
  certificado_discapacidad: false,
  id_obra_social: "",
  obra_social_texto: "",
  tipo: "candidato",
};

const initialResponsable = {
  nombre: "",
  apellido: "",
  telefono: "",
  email: "",
  parentesco: "",
  dni: "",
};

const PARENTESCO_OPTIONS = [
  { value: "madre", label: "Madre" },
  { value: "padre", label: "Padre" },
  { value: "tutor", label: "Tutor" },
  { value: "otro", label: "Otro" },
];

const normalizeObraName = (value) =>
  value
    ? String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
    : "";

export default function CrearNino({ onClose, onCreated, obrasSociales = [] }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [nino, setNino] = useState(initialNino);
  const [responsable, setResponsable] = useState(initialResponsable);
  const [foundResponsable, setFoundResponsable] = useState(null);
  const [parentescoOption, setParentescoOption] = useState("");
  const lookupMemoRef = useRef({ dni: null, status: null });

  useEffect(() => {
    if (foundResponsable && parentescoOption === "otro") {
      setResponsable((prev) => ({ ...prev, parentesco: "otro" }));
    }
  }, [foundResponsable, parentescoOption]);

  const obrasActivas = useMemo(() => {
    const lista = Array.isArray(obrasSociales) ? obrasSociales : [];
    const estadosActivos = [
      "activa",
      "activo",
      "habilitada",
      "habilitado",
      "vigente",
    ];

    return lista.filter((obra) => {
      if (!obra) return false;
      const estado = String(obra.estado ?? obra.status ?? "")
        .toLowerCase()
        .trim();
      const flags = [obra.activa, obra.activo, obra.habilitada, obra.habilitado];
      if (flags.some((flag) => flag === true || flag === 1 || flag === "1")) {
        return true;
      }
      if (flags.some((flag) => String(flag).toLowerCase() === "si")) {
        return true;
      }
      if (estado) {
        return estadosActivos.includes(estado);
      }
      return true;
    });
  }, [obrasSociales]);

  const matchedObra = useMemo(() => {
    if (!nino.id_obra_social) return null;
    const targetId = String(nino.id_obra_social);
    return (
      obrasActivas.find((obra) => {
        const obraId = obra?.id_obra_social ?? obra?.id ?? obra?.uuid;
        return obraId !== undefined && obraId !== null && String(obraId) === targetId;
      }) || null
    );
  }, [nino.id_obra_social, obrasActivas]);

  const obraInputValue = useMemo(() => {
    if (matchedObra?.nombre_obra_social) return matchedObra.nombre_obra_social;
    return nino.obra_social_texto || "";
  }, [matchedObra, nino.obra_social_texto]);

  const handleObraInputChange = (value) => {
    const normalizedValue = normalizeObraName(value);
    if (!normalizedValue) {
      setNino((prev) => ({
        ...prev,
        id_obra_social: "",
        obra_social_texto: "",
      }));
      return;
    }

    const match = obrasActivas.find((obra) => {
      const obraName = normalizeObraName(obra?.nombre_obra_social || "");
      return obraName && obraName === normalizedValue;
    });

    if (match) {
      const obraId = match.id_obra_social ?? match.id ?? match.uuid ?? "";
      setNino((prev) => ({
        ...prev,
        id_obra_social: obraId ? String(obraId) : "",
        obra_social_texto: "",
      }));
    } else {
      setNino((prev) => ({
        ...prev,
        id_obra_social: "",
        obra_social_texto: value,
      }));
    }
  };

  const obraManualNombre = useMemo(
    () => (nino.id_obra_social ? "" : (nino.obra_social_texto || "").trim()),
    [nino.id_obra_social, nino.obra_social_texto]
  );

  useEffect(() => {
    const dni = (responsable.dni || "").trim();
    if (!dni) {
      setFoundResponsable(null);
      setParentescoOption("");
      setResponsable((prev) => ({ ...prev, parentesco: "" }));
      if (lookupMemoRef.current.dni !== null || lookupMemoRef.current.status !== null) {
        lookupMemoRef.current = { dni: null, status: null };
      }
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const { data } = await axios.get(
          `http://localhost:5000/api/responsables?dni=${dni}`
        );
        const items = data?.data || [];
        if (items.length > 0) {
          const existing = items[0];
          setFoundResponsable(existing);
          setResponsable((prev) => ({
            ...prev,
            nombre: existing.nombre || prev.nombre,
            apellido: existing.apellido || prev.apellido,
            telefono: existing.telefono || prev.telefono,
            email: existing.email || prev.email,
          }));
          if (
            lookupMemoRef.current.dni !== dni ||
            lookupMemoRef.current.status !== "existing"
          ) {
            Swal.fire({
              icon: "info",
              title: "Responsable existente",
              text: "Se reutilizará el registro encontrado.",
              timer: 1400,
              showConfirmButton: false,
            });
            lookupMemoRef.current = { dni, status: "existing" };
          }
        } else {
          setFoundResponsable(null);
          if (
            lookupMemoRef.current.dni !== dni ||
            lookupMemoRef.current.status !== "missing"
          ) {
            Swal.fire({
              icon: "warning",
              title: "Responsable no registrado",
              text: "No encontramos ese DNI. Completa los datos para crearlo.",
              timer: 1600,
              showConfirmButton: false,
            });
            lookupMemoRef.current = { dni, status: "missing" };
          }
        }
      } catch (err) {
        console.warn("Error buscando responsable", err?.message || err);
      }
    }, 600);

    return () => clearTimeout(timeout);
  }, [responsable.dni]);

  const validarPaso1 = () => {
    if (!nino.nombre.trim()) {
      return "El nombre del niño es obligatorio";
    }
    if (!nino.apellido.trim()) {
      return "El apellido del niño es obligatorio";
    }
    return null;
  };

  const handleSubmit = async () => {
    const validation = validarPaso1();
    if (validation) {
      return Swal.fire({ icon: "error", title: "Faltan datos", text: validation });
    }
    if (!responsable.dni) {
      return Swal.fire({
        icon: "warning",
        title: "DNI requerido",
        text: "Ingrese el DNI del responsable.",
      });
    }

    const parentescoLimpio = (responsable.parentesco || "").trim();
    if (parentescoOption === "otro" && !foundResponsable) {
      if (!parentescoLimpio) {
        return Swal.fire({
          icon: "warning",
          title: "Parentesco requerido",
          text: "Especificá el parentesco cuando selecciones la opción Otro.",
        });
      }
    } else if (!parentescoLimpio) {
      return Swal.fire({
        icon: "warning",
        title: "Parentesco requerido",
        text: "Seleccioná un parentesco válido.",
      });
    }

    setLoading(true);
    try {
      const obraIdParsed = nino.id_obra_social
        ? Number.parseInt(nino.id_obra_social, 10)
        : null;
      const obraTexto = !nino.id_obra_social
        ? (nino.obra_social_texto || "").trim() || null
        : null;

      const payload = {
        nombre: nino.nombre,
        apellido: nino.apellido,
        dni: nino.dni || null,
        fecha_nacimiento: nino.fecha_nacimiento || null,
        certificado_discapacidad: !!nino.certificado_discapacidad,
        id_obra_social:
          obraIdParsed !== null && !Number.isNaN(obraIdParsed) ? obraIdParsed : null,
        obra_social_texto: obraTexto,
        tipo: nino.tipo,
        responsable: {
          nombre: foundResponsable?.nombre || responsable.nombre,
          apellido: foundResponsable?.apellido || responsable.apellido,
          telefono: foundResponsable?.telefono || responsable.telefono || null,
          email: foundResponsable?.email || responsable.email || null,
          parentesco: parentescoLimpio || null,
          dni: responsable.dni,
        },
      };

      const res = await axios.post("http://localhost:5000/api/ninos", payload);
      if (res?.data?.success) {
        Swal.fire({
          icon: "success",
          title: "Niño creado",
          timer: 1400,
          showConfirmButton: false,
        });
        onCreated?.(res.data.data);
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: res?.data?.message || "No se pudo crear el niño",
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
      setNino(initialNino);
      setResponsable(initialResponsable);
      setFoundResponsable(null);
      setParentescoOption("");
      lookupMemoRef.current = { dni: null, status: null };
    }, 200);
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
        <h2>Agregar niño</h2>

        {step === 1 && (
          <div className="crear-step">
            <h3>Datos del niño</h3>
            <div className="form-row">
              <label>
                Nombre
                <input
                  className="input-wide"
                  value={nino.nombre}
                  onChange={(e) => setNino({ ...nino, nombre: e.target.value })}
                  type="text"
                />
              </label>
              <label>
                Apellido
                <input
                  className="input-wide"
                  value={nino.apellido}
                  onChange={(e) => setNino({ ...nino, apellido: e.target.value })}
                  type="text"
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                DNI
                <input
                  className="input-small"
                  value={nino.dni}
                  onChange={(e) => setNino({ ...nino, dni: e.target.value })}
                  type="text"
                />
              </label>
              <label>
                Fecha de nacimiento
                <input
                  className="input-small"
                  type="date"
                  value={nino.fecha_nacimiento}
                  onChange={(e) =>
                    setNino({ ...nino, fecha_nacimiento: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Certificado discapacidad
                <select
                  value={nino.certificado_discapacidad ? "si" : "no"}
                  onChange={(e) =>
                    setNino({
                      ...nino,
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
                  value={nino.tipo}
                  onChange={(e) => setNino({ ...nino, tipo: e.target.value })}
                >
                  <option value="candidato">candidato</option>
                  <option value="paciente">paciente</option>
                </select>
              </label>
            </div>
            <label>
              Obra social
              <input
                type="text"
                value={obraInputValue}
                onChange={(e) => handleObraInputChange(e.target.value)}
                onBlur={(e) => {
                  const trimmed = e.target.value.trim();
                  setNino((prev) => {
                    if (prev.id_obra_social) return prev;
                    if ((prev.obra_social_texto || "").trim() === trimmed) {
                      return prev;
                    }
                    return {
                      ...prev,
                      obra_social_texto: trimmed,
                    };
                  });
                }}
                list="obras-sociales-activas"
                placeholder="Buscá o escribí una obra social"
              />
              <datalist id="obras-sociales-activas">
                {obrasActivas
                  .filter((obra) => (obra?.nombre_obra_social || "").trim().length > 0)
                  .map((obra) => {
                    const nombre = (obra?.nombre_obra_social || "").trim();
                    const optionKey = String(
                      obra?.id_obra_social ?? obra?.id ?? obra?.uuid ?? nombre
                    );
                    return <option key={optionKey} value={nombre} />;
                  })}
              </datalist>
              <span className="muted">
                Seleccioná una obra social activa o escribí una nueva. Las nuevas se crearán en estado pendiente.
              </span>
              {!nino.id_obra_social && obraManualNombre ? (
                <span className="muted">
                  Se registrará "{obraManualNombre}" como pendiente.
                </span>
              ) : null}
            </label>
            <div className="crear-actions">
              <button
                className="btn outline"
                onClick={close}
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
              Ingrese el DNI del responsable (sin puntos ni espacios). Si existe, se reutilizará el registro.
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
                  {foundResponsable.email || "—"} • {foundResponsable.telefono || "—"}
                </div>
                <div className="muted">
                  Se utilizará este responsable, puedes ajustar el parentesco si corresponde.
                </div>
              </div>
            ) : (
              <>
                <div className="form-row">
                  <label>
                    Nombre responsable
                    <input
                      className="input-wide"
                      value={responsable.nombre}
                      onChange={(e) =>
                        setResponsable({ ...responsable, nombre: e.target.value })
                      }
                      type="text"
                    />
                  </label>
                  <label>
                    Apellido responsable
                    <input
                      className="input-wide"
                      value={responsable.apellido}
                      onChange={(e) =>
                        setResponsable({ ...responsable, apellido: e.target.value })
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
                        setResponsable({ ...responsable, telefono: e.target.value })
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
                        setResponsable({ ...responsable, email: e.target.value })
                      }
                      type="email"
                    />
                  </label>
                </div>
              </>
            )}

            <label>
              Parentesco
              <select
                value={parentescoOption}
                onChange={(e) => {
                  const value = e.target.value;
                  setParentescoOption(value);
                  if (!value) {
                    setResponsable((prev) => ({ ...prev, parentesco: "" }));
                  } else if (value === "otro") {
                    setResponsable((prev) => ({
                      ...prev,
                      parentesco: foundResponsable ? "otro" : "",
                    }));
                  } else {
                    setResponsable((prev) => ({ ...prev, parentesco: value }));
                  }
                }}
              >
                <option value="">Seleccioná un parentesco</option>
                {PARENTESCO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {parentescoOption === "otro" && !foundResponsable && (
              <label>
                Especificá parentesco
                <input
                  value={responsable.parentesco}
                  onChange={(e) =>
                    setResponsable({
                      ...responsable,
                      parentesco: e.target.value,
                    })
                  }
                  type="text"
                  placeholder="Ej: tía"
                />
              </label>
            )}

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

