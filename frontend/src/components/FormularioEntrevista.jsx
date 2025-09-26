import "../styles/FormularioEntrevista.css";
import { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

export default function FormularioEntrevista() {

  const [formularioEntrevista, setFormularioEntrevista] = useState({
    nombre_nino: "",
    fecha_nacimiento: "",
    dni_nino: "",
    obra_social: "",
    nombre_responsable: "",
    telefono: "",
    aceptar_terminos: false,
    
  });

  const handleChange = (e) => {
    const {name,value,type,checked} = e.target;


  };

  const handleBlur = (e) => {

    const {name,value} = e.target;
    const error = validarCampo(name,value);
    if (error) {
      MySwal.fire({
        icon: "error",
        title: "Error",
        text: error,
      });
    }

  }


  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validar todos los campos antes de enviar
    for (const [key, value] of Object.entries(formularioEntrevista)) {
      const error = validarCampo(key, value);
      if (error) {
        MySwal.fire({
          icon: "error",
          title: "Error",
          text: error,
        });
        return;
      }
    }

    try {
      const respuesta = await axios.post(
        "http://localhost:5000/api/entrevista/crear-candidato",
        datosFinales
      );

      respuesta.data.success
        ? MySwal.fire({
            icon: "success",
            title: "Formulario enviado",
            text: "Gracias por completar el formulario, nos pondremos en contacto a la brevedad.",
          })
        : MySwal.fire({
            icon: "error",
            title: "Error",
            text: "Hubo un problema al enviar el formulario. Por favor, intenta nuevamente más tarde.",
          });
    } catch (err) {
      MySwal.fire({
        icon: "error",
        title: "Error",
        text: "Error de conexión con el servidor.",
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
            required
            onChange={handleChange}
          />
          <label className="label-entrevista" htmlFor="apellido_nino">
            Apellido
          </label>
          <input
            id="apellido_nino"
            className="entrevista__input"
            type="text"
            name="apellido_nino"
          placeholder="Ej:  Pérez"
          required
          onChange={handleChange}
        />
          <label className="label-entrevista">Fecha de nacimiento</label>
          <div className="entrevista__input-fecha">
            <input
              id="fecha_dia"
              className="entrevista__input"
              type="date"
              name="fecha_dia"
              placeholder="Día"
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
            onBlur={handleBlur}
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
            onChange={handleChange}
          />
          <label className="label-vacio-entrevista">
            En caso de no tener deje el campo vacío.
          </label>

         
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
            onChange={handleChange}
            required
          />
          <label className="label-entrevista" htmlFor="apellido_responsable">
            Apellido
          </label>
          <input
            id="apellido_responsable"
            className="entrevista__input"
            type="text"
            name="apellido_responsable"
            placeholder="Ej: García"
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
            placeholder="Ej: 3811234567"
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />
          <label className="label-entrevista" htmlFor="email">
            Correo electrónico
            </label>
          <input
            id="email"
            className="entrevista__input"
            type="email"
            name="email"
            placeholder="Ej: juanperez@gmail.com"
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />
          <label className="label-entrevista" htmlFor="parentesco">
            Parentesco con el niño/a
          </label>
          <select
            id="parentesco"
            className="entrevista__input"
            name="parentesco"
            onChange={handleChange}
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
          <legend>Motivo de consulta </legend>
           <label className="label-entrevista" htmlFor="motivo_consulta">
            Motivo de consulta
          </label>
          <textarea
            id="motivo_consulta"
            type="text"
            name="motivo_consulta"
            placeholder="Describa brevemente los motivos por los cuales solicita la entrevista"
            className="entrevista__input"
            onChange={handleChange}
          />  
          <label className="label-informacion-entrevista">
            Todos los datos proporcionados son confidenciales y se utilizarán
            únicamente para fines terapéuticos.
          </label>
        </fieldset>
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
        <button type="submit" className="entrevista__boton">
          Enviar
        </button>
      </form>
    </section>
  );
}
