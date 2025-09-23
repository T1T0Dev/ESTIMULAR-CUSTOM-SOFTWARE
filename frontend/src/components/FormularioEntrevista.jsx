import "../styles/FormularioEntrevista.css";
import {useState} from "react";
import axios from "axios";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

export default function FormularioEntrevista() {
  const [formularioEntrevista, setFormularioEntrevista] = useState({
    nombre_nino: "",
    //Concatenar strings
    fecha_nacimiento: "",
    dni_nino: "",
    obra_social: "",
    nombre_responsable: "",
    telefono: "",
    aceptar_terminos: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormularioEntrevista((prevState) => ({
      ...prevState,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {

    e.preventDefault();

    const respuesta = await axios.post("http://localhost:5000/api/entrevista", formularioEntrevista)

    respuesta.data.success ? MySwal.fire({
      icon: 'success',
      title: 'Formulario enviado',
      text: 'Gracias por completar el formulario, nos pondremos en contacto a la brevedad.',
    }) : MySwal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Hubo un problema al enviar el formulario. Por favor, intenta nuevamente más tarde.',
    });

    setFormularioEntrevista({
      nombre_nino: "",
      fecha_nacimiento: "",
      dni_nino: "",
      obra_social: "",
      nombre_responsable: "",
      telefono: "",
      aceptar_terminos: false,
    });
    // Reiniciar el formulario
    e.target.reset();
  }

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
            Nombre completo del niño/a
          </label>
          <input
            id="nombre_nino"
            className="entrevista__input"
            type="text"
            name="nombre_nino"
            placeholder="Ej: Juan Pérez"
            required
            onChange={handleChange}

          />

          <label className="label-entrevista" htmlFor="fecha_dia">
            Fecha de nacimiento
          </label>
          <div className="entrevista__input-fecha">
            <input
              id="fecha_dia"
              className="entrevista__input"
              type="text"
              name="dia"
              placeholder="Día"
              required
              onChange={handleChange}
            />
            <input
              id="fecha_mes"
              className="entrevista__input"
              type="text"
              name="mes"
              placeholder="Mes"
              required
              onChange={handleChange}
            />
            <input
              id="fecha_ano"
              className="entrevista__input"
              type="text"
              name="ano"
              placeholder="Año"
              required
              onChange={handleChange}
            />
          </div>
          <label className="label-entrevista" htmlFor="dni_nino">
            DNI del niño/a
          </label>
          <input
            id="dni_nino"
            className="entrevista__input"
            type="text"
            name="dni_nino"
            placeholder="Ej: 12345678"
            required
            onChange={handleChange}
          />
          <label className="label-entrevista" htmlFor="obra_social">
            Obra social
          </label>
          <input
            id="obra_social"
            className="entrevista__input"
            type="text"
            name="obra_social"
            placeholder="Ej: OSDE"
            required
            onChange={handleChange}
          />
          <label className="label-vacio-entrevista">
            En caso de no tener deje el campo vacio.{" "}
          </label>
        </fieldset>

        <fieldset>
          <legend>Datos del responsable</legend>
          <label className="label-entrevista" htmlFor="nombre_responsable">
            Nombre completo del responsable
          </label>
          <input
            id="nombre_responsable"
            className="entrevista__input"
            type="text"
            name="nombre_responsable"
            placeholder="Ej: María López"
            onChange={handleChange}
            required
          />

          <label className="label-entrevista" htmlFor="telefono">
            Teléfono
          </label>
          <input
            id="telefono"
            className="entrevista__input"
            type="tel"
            name="telefono"
            placeholder="Ej: 381-1234567"
            onChange={handleChange}
            required
          />
        </fieldset>

        <fieldset>
          <legend>Consentimiento</legend>
          <label className="label-informacion-entrevista">
            {" "}
            Todos los datos proporcionados son confidenciales y se utilizarán
            únicamente para fines terapéuticos.{" "}
          </label>
          <div className="entrevista__terminos-container">
            <input
              className="entrevista__aceptar-terminos"
              id="aceptar_terminos"
              type="checkbox"
              name="aceptar_terminos"
              onChange={handleChange}
              required
            />
            <label
              className="entrevista__label-terminos"
              htmlFor="aceptar_terminos"
              title="Debe aceptar los términos y condiciones para continuar"
            >
              Acepto los términos y condiciones
            </label>
          </div>
        </fieldset>

        <button  type="submit" className="entrevista__boton">
          Enviar
        </button>
      </form>
    </section>
  );
}
