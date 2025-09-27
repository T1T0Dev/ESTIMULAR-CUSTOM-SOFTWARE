import "../styles/FormularioEntrevista.css";
import { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
const MySwal = withReactContent(Swal);

export default function FormularioEntrevista() {
  const [aceptar_terminos, setAceptarTerminos] = useState(false);

  const [tieneCertificado, setTieneCertificado] = useState(false);

  const [errores, setErrores] = useState({});

  const [formularioEntrevista, setFormularioEntrevista] = useState({
    nombre_nino: "",
    apellido_nino: "",
    fecha_nacimiento: "",
    dni_nino: "",
    obra_social: "",
    nombre_responsable: "",
    apellido_responsable: "",
    telefono: "",
    email: "",
    parentesco: "",
    motivo_consulta: "",
  });

  const obrasSociales = [
    { id: "ospe", nombre: "OSPE" },
    { id: "swissmedical", nombre: "Swiss Medical" },
    { id: "sancor", nombre: "Sancor" },
    { id: "osecac", nombre: "OSECAC" },
    { id: "boreal", nombre: "Boreal" },
    { id: "ospia", nombre: "OSPIA Alimentación" },
    { id: "ossacra", nombre: "OSSACRA" },
    { id: "camioneros", nombre: "Camioneros" },
    { id: "ospecon", nombre: "OSPECON" },
    { id: "bramed", nombre: "Bramed" },
    { id: "subsidio_salud", nombre: "Subsidio de Salud" },
    { id: "opegap", nombre: "Opegap" },
    { id: "oseg", nombre: "OSEG" },
    { id: "ospaga", nombre: "OSPAGA" },
    { id: "ospaca", nombre: "OSPACA" },
    { id: "osdop", nombre: "OSDOP" },
    { id: "prensa", nombre: "Prensa" },
    { id: "redseguromedico", nombre: "Red de Seguro Médico" },
  ];

  const validarCampo = (name, value) => {
    if (!value) return null;

    switch (name) {
      case "nombre_nino":
      case "apellido_nino":
      case "nombre_responsable":
      case "apellido_responsable":
        if (!value || !/^[a-zA-ZÀ-ÿ\s]{2,50}$/.test(value)) {
          return "El nombre y apellido deben contener solo letras y espacios, y tener entre 2 y 50 caracteres.";
        }
        break;
      case "dni_nino":
        if (!value || !/^\d{7,8}$/.test(value)) {
          return "El DNI debe contener entre 7 y 8 dígitos numéricos.";
        }
        break;
      case "telefono":
        if (!value || !/^\d{7,15}$/.test(value)) {
          return "El teléfono debe contener entre 7 y 15 dígitos numéricos.";
        }
        break;
      case "email":
        if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return "El correo electrónico no es válido.";
        }
        break;
      case "fecha_nacimiento":
        if (!value) return "La fecha de nacimiento es obligatoria.";
        const fecha = new Date(value);
        const hoy = new Date();
        const fechaMax = new Date(
          hoy.getFullYear(),
          hoy.getMonth(),
          hoy.getDate()
        );
        const fechaMin = new Date(
          hoy.getFullYear() - 18,
          hoy.getMonth(),
          hoy.getDate()
        );
        if (fecha < fechaMin || fecha > fechaMax) {
          return "La fecha de nacimiento debe ser válida y el niño/a tener hasta 18 años.";
        }
        break;
      case "obra_social":
        if (value && !/^[a-zA-ZÀ-ÿ\s]{2,50}$/.test(value)) {
          return "La obra social debe contener solo letras y espacios, y tener entre 2 y 50 caracteres.";
        }
        break;
      case "aceptar_terminos":
        if (!value)
          return "Debe aceptar los términos y condiciones para continuar.";
        break;
      default:
        break;
    }
    return null;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "certificado_discapacidad") {
      setTieneCertificado(checked);
      setFormularioEntrevista((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    if (type === "checkbox" && name === "aceptar_terminos") {
      setAceptarTerminos(checked);
    }

    setFormularioEntrevista((prevState) => ({
      ...prevState,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validarCampo(name, value);
    setErrores((prev) => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar todos los campos, incluyendo el checkbox
    const nuevosErrores = {};
    const campos = {
      ...formularioEntrevista,
      aceptar_terminos: aceptar_terminos,
    };

    Object.entries(campos).forEach(([key, value]) => {
      const error = validarCampo(key, value);
      if (error) nuevosErrores[key] = error;
    });

    setErrores(nuevosErrores);

    // Si hay errores, no enviar
    if (Object.keys(nuevosErrores).length > 0) return;

    try {
      const respuesta = await axios.post(
        "http://localhost:5000/api/entrevista/crear-candidato",
        formularioEntrevista
      );

      if (respuesta.data.success) {
        MySwal.fire({
          icon: "success",
          title: "Formulario enviado",
          text: "Gracias por completar el formulario, nos pondremos en contacto a la brevedad.",
        });

        setFormularioEntrevista({
          nombre_nino: "",
          apellido_nino: "",
          fecha_nacimiento: "",
          dni_nino: "",
          certificado_discapacidad: false,
          obra_social: "",
          nombre_responsable: "",
          apellido_responsable: "",
          telefono: "",
          email: "",
          parentesco: "",
          motivo_consulta: "",
        });
        setAceptarTerminos(false);
        setTieneCertificado(false);
        setErrores({});
      } else {
        MySwal.fire({
          icon: "error",
          title: "Error",
          text: "Intente más tarde.",
        });
      }
    } catch (err) {
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
        Por favor complete el siguiente formulario
        <br />
        con la información del niño/a y del responsable.
      </p>
      <form
        onSubmit={handleSubmit}
        className="entrevista__form"
        aria-label="Formulario de primera entrevista"
      >
        <fieldset>
          <legend>Datos del niño/a</legend>
          <label className="label-entrevista" htmlFor="nombre_nino">
            Nombre
          </label>
          <input
            id="nombre_nino"
            className="entrevista__input"
            type="text"
            name="nombre_nino"
            placeholder="Ej: Juan"
            value={formularioEntrevista.nombre_nino}
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />
          {errores.nombre_nino && (
            <span className="error-message">{errores.nombre_nino}</span>
          )}

          <label className="label-entrevista" htmlFor="apellido_nino">
            Apellido
          </label>
          <input
            id="apellido_nino"
            className="entrevista__input"
            type="text"
            name="apellido_nino"
            placeholder="Ej: Pérez"
            value={formularioEntrevista.apellido_nino}
            onChange={handleChange}
            onBlur={handleBlur}
            required
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
            value={formularioEntrevista.fecha_nacimiento}
            onChange={handleChange}
            onBlur={handleBlur}
            required
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

          <label className="label-entrevista" htmlFor="dni_nino">
            DNI del niño/a
          </label>
          <input
            id="dni_nino"
            className="entrevista__input"
            type="text"
            name="dni_nino"
            placeholder="Ej: 12345678"
            value={formularioEntrevista.dni_nino}
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />
          {errores.dni_nino && (
            <span className="error-message">{errores.dni_nino}</span>
          )}
        </fieldset>

        <fieldset>
          <legend>Datos del responsable</legend>
          <label className="label-entrevista" htmlFor="nombre_responsable">
            Nombre
          </label>
          <input
            id="nombre_responsable"
            className="entrevista__input"
            type="text"
            name="nombre_responsable"
            placeholder="Ej: María"
            value={formularioEntrevista.nombre_responsable}
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />
          {errores.nombre_responsable && (
            <span className="error-message">{errores.nombre_responsable}</span>
          )}

          <label className="label-entrevista" htmlFor="apellido_responsable">
            Apellido
          </label>
          <input
            id="apellido_responsable"
            className="entrevista__input"
            type="text"
            name="apellido_responsable"
            placeholder="Ej: García"
            value={formularioEntrevista.apellido_responsable}
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />
          {errores.apellido_responsable && (
            <span className="error-message">
              {errores.apellido_responsable}
            </span>
          )}

          <label className="label-entrevista" htmlFor="telefono">
            Teléfono
          </label>
          <input
            id="telefono"
            className="entrevista__input"
            type="tel"
            name="telefono"
            placeholder="Ej: 3811234567"
            value={formularioEntrevista.telefono}
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />
          {errores.telefono && (
            <span className="error-message">{errores.telefono}</span>
          )}

          <label className="label-entrevista" htmlFor="email">
            Correo electrónico
          </label>
          <input
            id="email"
            className="entrevista__input"
            type="email"
            name="email"
            placeholder="Ej: juanperez@gmail.com"
            value={formularioEntrevista.email}
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />
          {errores.email && (
            <span className="error-message">{errores.email}</span>
          )}

          <label className="label-entrevista" htmlFor="parentesco">
            Parentesco con el niño/a
          </label>
          <select
            id="parentesco"
            className="entrevista__input"
            name="parentesco"
            value={formularioEntrevista.parentesco}
            onChange={handleChange}
            onBlur={handleBlur}
            required
          >
            <option value="">Seleccione una opción</option>
            <option value="madre">Madre</option>
            <option value="padre">Padre</option>
            <option value="tutor">Tutor</option>
            <option value="otro">Otro</option>
          </select>
        </fieldset>

        <fieldset>
          <label className="label-entrevista" htmlFor="obra_social">
            ¿Tiene certificado de discapacidad?
          </label>
          <div className="entrevista__radio-group">
            <button
              type="button"
              className={`btn-opcion ${tieneCertificado ? "activo" : ""}`}
              onClick={() => {
                setTieneCertificado(true);
                setFormularioEntrevista((prev) => ({
                  ...prev,
                  certificado_discapacidad: true,
                }));
              }}
            >
              Sí
            </button>
            <button
              type="button"
              className={`btn-opcion ${!tieneCertificado ? "activo" : ""}`}
              onClick={() => {
                setTieneCertificado(false);
                setFormularioEntrevista((prev) => ({
                  ...prev,
                  certificado_discapacidad: false,
                  obra_social: "", // resetear obra social si elige "No"
                }));
              }}
            >
              No
            </button>
          </div>
          {tieneCertificado && (
            <select
              className="entrevista__input"
              name="obra_social"
              value={formularioEntrevista.obra_social}
              onChange={handleChange}
            >
              <option value="">-- Seleccionar --</option>
              {obrasSociales.map((obra) => (
                <option key={obra.id} value={obra.id}>
                  {obra.nombre}
                </option>
              ))}
              <option value="otra">Otra</option>
            </select>
          )}
          <label className="label-entrevista" htmlFor="motivo_consulta">
            Describa brevemente los motivos por los cuales solicita la
            entrevista
          </label>
          <textarea
            name="motivo_consulta"
            className="entrevista__input"
            placeholder="Mi hijo tiene dificultades en..."
            value={formularioEntrevista.motivo_consulta}
            onChange={handleChange}
            maxLength={250}
            required
          />
          <span className="max-caracteres">Maximo de 250 caracteres</span>
        </fieldset>

        <div className="entrevista__terminos-container">
          <input
            id="aceptar_terminos"
            className="entrevista__checkbox"
            type="checkbox"
            name="aceptar_terminos"
            checked={aceptar_terminos}
            onChange={handleChange}
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
