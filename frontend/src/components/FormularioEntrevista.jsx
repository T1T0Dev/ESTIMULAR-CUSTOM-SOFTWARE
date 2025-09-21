import "../styles/FormularioEntrevista.css";

export default function FormularioEntrevista() {
  return (
    <section className="entrevista__formulario">
      <h1 className="entrevista__titulo">Primera Entrevista</h1>
      <p className="entrevista__subtitulo">
        Por favor complete el siguiente formulario<br />
        con la información del niño/a y del responsable.
      </p>
      <form className="entrevista__form" aria-label="Formulario de primera entrevista">
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
          />

          <label className="label-entrevista" htmlFor="fecha_dia">Fecha de nacimiento</label>
          <div className="entrevista__input-fecha">
            <input
              id="fecha_dia"
              className="entrevista__input"
              type="text"
              name="dia"
              placeholder="Día"
              required
            />
            <input
              id="fecha_mes"
              className="entrevista__input"
              type="text"
              name="mes"
              placeholder="Mes"
              required
            />
            <input
              id="fecha_ano"
              className="entrevista__input"
              type="text"
              name="ano"
              placeholder="Año"
              required
            />
          </div>
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
            required
          />
        </fieldset>

        <fieldset>
          <legend>Motivo de consulta</legend>
          <label className="label-entrevista" htmlFor="motivo">
            Motivo de consulta
          </label>
          <input
            id="motivo"
            className="entrevista__input"
            type="text"
            name="motivo"
            placeholder="Explique brevemente"
            required
          />
        </fieldset>

        <fieldset>
          <legend>Consentimiento</legend>
          <div className="entrevista__terminos-container">
            <input
              className="entrevista__aceptar-terminos"
              id="aceptar_terminos"
              type="checkbox"
              name="aceptar_terminos"
              required
            />
            <label className="entrevista__label-terminos" htmlFor="aceptar_terminos">
              Acepto los términos y condiciones
            </label>
          </div>
        </fieldset>

        <button type="submit" className="entrevista__boton">
          Enviar
        </button>
      </form>
    </section>
  );
}
