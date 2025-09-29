import "../styles/FormularioEntrevista.css";
import { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
const MySwal = withReactContent(Swal);

/* ---------- Helpers / Validations ---------- */
const normalize = (s = "") =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const validators = {
  nombre: (v) =>
    !v || !/^[a-zA-ZÀ-ÿ\s]{2,50}$/.test(v)
      ? "Debe contener solo letras/espacios (2-50)."
      : null,
  dni: (v) =>
    !v || !/^\d{7,8}$/.test(v) ? "DNI inválido (7-8 dígitos)." : null,
  telefono: (v) =>
    !v || !/^\d{7,15}$/.test(v) ? "Teléfono inválido (7-15 dígitos)." : null,
  email: (v) =>
    !v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "Correo inválido." : null,
  fecha_nacimiento: (v) => {
    if (!v) return "Fecha obligatoria.";
    const fecha = new Date(v);
    const hoy = new Date();
    const min = new Date(hoy.getFullYear() - 18, hoy.getMonth(), hoy.getDate());
    const max = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    return fecha < min || fecha > max
      ? "Niño/a debe tener hasta 18 años."
      : null;
  },
  obra_social: (v, { hasObraSocial }) => {
    if (!hasObraSocial) return null;
    // Si es selección del catálogo, v es un id (string o number)
    if (typeof v === "number" || (/^\d+$/.test(v) && v !== "")) {
      return null; // id válido
    }
    if (!v || typeof v !== "string" || v.trim().length < 2)
      return "Seleccione o escriba la obra social.";
    return !/^[\wÀ-ÿ\s.-]{2,80}$/.test(v.trim())
      ? "Nombre de obra social inválido."
      : null;
  },
  aceptar_terminos: (v) => (!v ? "Debe aceptar los términos." : null),
};

/* ---------- Custom hook para traer obras sociales ---------- */
function useObrasSociales() {
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await axios.get(
          "http://localhost:5000/api/obras-sociales/"
        );
        if (!mounted) return;
        if (res.data && res.data.success && Array.isArray(res.data.data))
          setObras(res.data.data);
        else if (Array.isArray(res.data)) setObras(res.data);
        else console.warn("Respuesta inesperada obras:", res.data);
      } catch (err) {
        console.error("Error al obtener obras sociales:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  return { obras, loading };
}

/* ---------- Pequeños componentes reutilizables ---------- */
const TextInput = ({ id, label, name, value, onChange, onBlur, ...rest }) => (
  <>
    <label className="label-entrevista" htmlFor={id}>
      {label}
    </label>
    <input
      id={id}
      className="entrevista__input"
      name={name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      {...rest}
    />
  </>
);

const ToggleYesNo = ({ label, active, onYes, onNo }) => (
  <>
    <label className="label-entrevista">{label}</label>
    <div className="entrevista__radio-group">
      <button
        type="button"
        className={`btn-opcion ${active ? "activo" : ""}`}
        onClick={onYes}
      >
        Sí
      </button>
      <button
        type="button"
        className={`btn-opcion ${!active ? "activo" : ""}`}
        onClick={onNo}
      >
        No
      </button>
    </div>
  </>
);

const SelectWithOther = ({
  label,
  obras,
  value,
  seleccionOtra,
  onSelect,
  onOtherChange,
  onOtherBlur,
}) => (
  <>
    <label className="label-entrevista" htmlFor="obra_social_select">
      {label}
    </label>
    <select
      id="obra_social_select"
      className="entrevista__input"
      value={seleccionOtra ? "otra" : value}
      onChange={onSelect}
      required
    >
      <option value="">-- Seleccionar --</option>
      {obras.map((obra) => (
        <option key={obra.id_obra_social} value={obra.id_obra_social}>
          {obra.nombre}
        </option>
      ))}
      <option value="otra">Otra</option>
    </select>
    {seleccionOtra && (
      <input
        className="entrevista__input"
        type="text"
        name="obra_social_texto"
        placeholder="Escriba su obra social"
        value={value || ""}
        onChange={onOtherChange}
        onBlur={onOtherBlur}
        required
      />
    )}
  </>
);

/* ---------- Componente principal (modular) con auto-selección en blur ---------- */
export default function FormularioEntrevista() {
  const [aceptar_terminos, setAceptarTerminos] = useState(false);
  const [errores, setErrores] = useState({});
  const { obras: obrasSociales } = useObrasSociales();

  const [formulario, setFormulario] = useState({
    nombre_nino: "",
    apellido_nino: "",
    fecha_nacimiento: "",
    dni_nino: "",
    certificado_discapacidad: false,
    id_obra_social: "",
    obra_social_texto: "",
    nombre_responsable: "",
    apellido_responsable: "",
    telefono: "",
    email: "",
    parentesco: "",
    motivo_consulta: "",
  });

  // estados locales que NO se envían al backend
  const [hasObraSocial, setHasObraSocial] = useState(false);
  const [seleccionOtra, setSeleccionOtra] = useState(false);

  const setField = (field, value) =>
    setFormulario((p) => ({ ...p, [field]: value }));

  /* Handlers específicos */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox" && name === "certificado_discapacidad") {
      setField(name, checked);
      return;
    }
    if (type === "checkbox" && name === "aceptar_terminos") {
      setAceptarTerminos(checked);
      return;
    }
    setField(name, value);
  };

  const toggleHasObraSocial = (si) => {
    setHasObraSocial(Boolean(si));
    if (!si) {
      setField("obra_social", "");
      setSeleccionOtra(false);
    } else {
      setSeleccionOtra(false);
    }
  };

  const handleObraSelect = (e) => {
    const v = e.target.value;
    if (v === "otra") {
      setField("id_obra_social", "");
      setField("obra_social_texto", "");
      setSeleccionOtra(true);
    } else {
      setField("id_obra_social", v);
      setField("obra_social_texto", "");
      setSeleccionOtra(false);
    }
  };

  // onChange for the "otra" input (just update value, no auto-match here)
  // Eliminado: const handleObraOtherChange = (e) => setField("obra_social", e.target.value);
  const handleObraOtherChange = (e) =>
    setField("obra_social_texto", e.target.value);

  // onBlur: check normalized match and auto-select if exists
  const handleObraOtherBlur = () => {
    const typed = formulario.obra_social_texto || "";
    const typedNorm = normalize(typed);
    if (!typedNorm) return;
    const match = obrasSociales.find((obra) => {
      const nombre = obra.nombre || "";
      return normalize(nombre) === typedNorm;
    });
    if (match) {
      setField("id_obra_social", match.id_obra_social);
      setField("obra_social_texto", "");
      setSeleccionOtra(false);
    }
    // else leave as typed (no message)
  };

  const validarTodos = () => {
    const nuevos = {};
    nuevos.nombre_nino = validators.nombre(formulario.nombre_nino);
    nuevos.apellido_nino = validators.nombre(formulario.apellido_nino);
    nuevos.fecha_nacimiento = validators.fecha_nacimiento(
      formulario.fecha_nacimiento
    );
    nuevos.dni_nino = validators.dni(formulario.dni_nino);
    nuevos.nombre_responsable = validators.nombre(
      formulario.nombre_responsable
    );
    nuevos.apellido_responsable = validators.nombre(
      formulario.apellido_responsable
    );
    nuevos.telefono = validators.telefono(formulario.telefono);
    nuevos.email = validators.email(formulario.email);
    nuevos.parentesco = !formulario.parentesco
      ? "Seleccione parentesco."
      : null;
    nuevos.motivo_consulta = !formulario.motivo_consulta
      ? "Motivo obligatorio."
      : null;
    nuevos.aceptar_terminos = validators.aceptar_terminos(aceptar_terminos);
    nuevos.obra_social = hasObraSocial
      ? seleccionOtra
        ? validators.obra_social(formulario.obra_social_texto, {
            hasObraSocial,
          })
        : validators.obra_social(formulario.id_obra_social, { hasObraSocial })
      : null;

    Object.keys(nuevos).forEach((k) => {
      if (nuevos[k] === null) delete nuevos[k];
    });
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarTodos()) return;

    // preparar payload para backend
    const candidatoPayload = {
      nombre_nino: formulario.nombre_nino,
      apellido_nino: formulario.apellido_nino,
      fecha_nacimiento: formulario.fecha_nacimiento,
      dni_nino: formulario.dni_nino,
      certificado_discapacidad: formulario.certificado_discapacidad,
      id_obra_social: seleccionOtra ? null : formulario.id_obra_social,
      obra_social_texto: seleccionOtra ? formulario.obra_social_texto : null,
      motivo_consulta: formulario.motivo_consulta,
    };
    const responsablePayload = {
      nombre_responsable: formulario.nombre_responsable,
      apellido_responsable: formulario.apellido_responsable,
      telefono: formulario.telefono,
      email: formulario.email,
      parentesco: formulario.parentesco,
      es_principal: true,
    };
    try {
      const res = await axios.post(
        "http://localhost:5000/api/entrevista/crear-candidato",
        {
          candidato: candidatoPayload,
          responsable: responsablePayload,
        }
      );
      if (res.data?.success) {
        MySwal.fire({
          icon: "success",
          title: "Enviado",
          text: "Formulario recibido. Gracias",
          confirmButtonColor: "#ff66b2", // botón rosado más intenso
        });
        // reset del formulario
        setFormulario({
          nombre_nino: "",
          apellido_nino: "",
          fecha_nacimiento: "",
          dni_nino: "",
          certificado_discapacidad: false,
          id_obra_social: "",
          obra_social_texto: "",
          nombre_responsable: "",
          apellido_responsable: "",
          telefono: "",
          email: "",
          parentesco: "",
          motivo_consulta: "",
        });
        setAceptarTerminos(false);
        setHasObraSocial(false);
        setSeleccionOtra(false);
        setErrores({});
      } else {
        MySwal.fire({
          icon: "error",
          title: "Error",
          text: res.data?.message || "Intente más tarde.",
        });
      }
    } catch (err) {
      console.error(err);
      MySwal.fire({
        icon: "error",
        title: "Error",
        text: "Error de conexión.",
      });
    }
  };

  return (
    <section className="entrevista__formulario">
      <h1 className="entrevista__titulo">Primera Entrevista</h1>
      <p className="entrevista__subtitulo">
        Por favor complete el formulario con la información del niño/a y del
        responsable.
      </p>

      <form
        onSubmit={handleSubmit}
        className="entrevista__form"
        aria-label="Formulario de primera entrevista"
      >
        <fieldset>
          <legend>Datos del niño/a</legend>
          <TextInput
            id="nombre_nino"
            label="Nombre/s"
            name="nombre_nino"
            value={formulario.nombre_nino}
            onChange={handleChange}
            placeholder="Ej: Juan"
          />
          {errores.nombre_nino && (
            <span className="error-message">{errores.nombre_nino}</span>
          )}

          <TextInput
            id="apellido_nino"
            label="Apellido/s"
            name="apellido_nino"
            value={formulario.apellido_nino}
            onChange={handleChange}
            placeholder="Ej: Pérez"
          />
          {errores.apellido_nino && (
            <span className="error-message">{errores.apellido_nino}</span>
          )}

          <label className="label-entrevista" htmlFor="fecha_nacimiento">
            Fecha de nacimiento
          </label>
          <input
            id="fecha_nacimiento"
            className="entrevista__input"
            type="date"
            name="fecha_nacimiento"
            value={formulario.fecha_nacimiento}
            onChange={handleChange}
            min={
              new Date(new Date().setFullYear(new Date().getFullYear() - 18))
                .toISOString()
                .split("T")[0]
            }
            max={new Date().toISOString().split("T")[0]}
          />
          {errores.fecha_nacimiento && (
            <span className="error-message">{errores.fecha_nacimiento}</span>
          )}

          <TextInput
            id="dni_nino"
            label="DNI del niño/a"
            name="dni_nino"
            value={formulario.dni_nino}
            onChange={handleChange}
            placeholder="Ej: 12345678"
          />
          {errores.dni_nino && (
            <span className="error-message">{errores.dni_nino}</span>
          )}

          <ToggleYesNo
            label="¿El niño/a posee certificado de discapacidad?"
            active={formulario.certificado_discapacidad}
            onYes={() => setField("certificado_discapacidad", true)}
            onNo={() => setField("certificado_discapacidad", false)}
          />

          <ToggleYesNo
            label="¿El niño/a posee obra social?"
            active={hasObraSocial}
            onYes={() => toggleHasObraSocial(true)}
            onNo={() => toggleHasObraSocial(false)}
          />

          {hasObraSocial && (
            <>
              <SelectWithOther
                label="Obra social"
                obras={obrasSociales}
                value={
                  seleccionOtra
                    ? formulario.obra_social_texto
                    : formulario.id_obra_social
                }
                seleccionOtra={seleccionOtra}
                onSelect={handleObraSelect}
                onOtherChange={handleObraOtherChange}
                onOtherBlur={handleObraOtherBlur}
              />
              {errores.obra_social && (
                <span className="error-message">{errores.obra_social}</span>
              )}
            </>
          )}
        </fieldset>

        <fieldset>
          <legend>Datos del responsable</legend>
          <TextInput
            id="nombre_responsable"
            label="Nombre/s"
            name="nombre_responsable"
            value={formulario.nombre_responsable}
            onChange={handleChange}
            placeholder="Ej: María"
          />
          {errores.nombre_responsable && (
            <span className="error-message">{errores.nombre_responsable}</span>
          )}

          <TextInput
            id="apellido_responsable"
            label="Apellido/s"
            name="apellido_responsable"
            value={formulario.apellido_responsable}
            onChange={handleChange}
            placeholder="Ej: García"
          />
          {errores.apellido_responsable && (
            <span className="error-message">
              {errores.apellido_responsable}
            </span>
          )}

          <TextInput
            id="telefono"
            label="Teléfono"
            name="telefono"
            value={formulario.telefono}
            onChange={handleChange}
            placeholder="Ej: 1123456789"
          />
          {errores.telefono && (
            <span className="error-message">{errores.telefono}</span>
          )}

          <TextInput
            id="email"
            label="Email"
            name="email"
            value={formulario.email}
            onChange={handleChange}
            placeholder="Ej: ejemplo@email.com"
          />
          {errores.email && (
            <span className="error-message">{errores.email}</span>
          )}

          <label className="label-entrevista" htmlFor="parentesco">
            Parentesco
          </label>
          <select
            id="parentesco"
            className="entrevista__input"
            name="parentesco"
            value={formulario.parentesco}
            onChange={handleChange}
            required
          >
            <option value="">Seleccione una opción</option>
            <option value="madre">Madre</option>
            <option value="padre">Padre</option>
            <option value="tutor">Tutor</option>
            <option value="otro">Otro</option>
          </select>
          {errores.parentesco && (
            <span className="error-message">{errores.parentesco}</span>
          )}
        </fieldset>

        <fieldset>
          <label className="label-entrevista" htmlFor="motivo_consulta">
            Motivo de la consulta
          </label>
          <textarea
            id="motivo_consulta"
            name="motivo_consulta"
            className="entrevista__input"
            placeholder="Mi hijo tiene dificultades en..."
            value={formulario.motivo_consulta}
            onChange={handleChange}
            maxLength={250}
            required
          />
          {errores.motivo_consulta && (
            <span className="error-message">{errores.motivo_consulta}</span>
          )}
        </fieldset>

        <div className="entrevista__terminos-container">
          <input
            id="aceptar_terminos"
            className="entrevista__checkbox"
            type="checkbox"
            name="aceptar_terminos"
            checked={aceptar_terminos}
            onChange={(e) => setAceptarTerminos(e.target.checked)}
          />
          <label
            className="entrevista__label-terminos"
            htmlFor="aceptar_terminos"
          >
            Acepto los términos y condiciones
          </label>
        </div>
        {errores.aceptar_terminos && (
          <span className="error-message">{errores.aceptar_terminos}</span>
        )}

        <button className="entrevista__boton" type="submit">
          Enviar
        </button>
      </form>
    </section>
  );
}
