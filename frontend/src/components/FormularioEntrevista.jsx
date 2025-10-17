import "../styles/FormularioEntrevista.css";
import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
const Alerta = withReactContent(Swal);

/* ─────────────── Helpers ─────────────── */
const SERVICIOS = [
  { id: "psicologa", etiqueta: "Psicóloga" },
  { id: "psicopedagoga", etiqueta: "Psicopedagoga" },
  { id: "terapeuta_ocupacional", etiqueta: "Terapeuta Ocupacional" },
  { id: "fonoaudiologa", etiqueta: "Fonoaudióloga" },
];

const normalizarTexto = (texto = "") =>
  texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const VALIDADORES = {
  requerido:
    (mensaje = "Campo obligatorio.") =>
    (valor) =>
      !valor ? mensaje : null,
  nombre: (valor) =>
    !valor || !/^[a-zA-ZÀ-ÿ\s]{2,50}$/.test(valor)
      ? "Debe contener solo letras/espacios (2-50)."
      : null,
  dni: (valor) =>
    !/^\d{7,8}$/.test(valor) ? "DNI inválido (7-8 dígitos)." : null,
  telefono: (valor) =>
    !/^\d{7,15}$/.test(valor) ? "Teléfono inválido (7-15 dígitos)." : null,
  email: (valor) =>
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor) ? "Correo inválido." : null,
  fechaEnRango: (minima, maxima) => (valor) => {
    if (!valor) return "Fecha obligatoria.";
    const fecha = new Date(valor);
    return fecha < minima || fecha > maxima
      ? "Niño/a debe tener hasta 18 años."
      : null;
  },
  obraSocialEscrita: (valor) => {
    if (!valor || valor.trim().length < 2) return "Escriba la obra social.";
    return !/^[\wÀ-ÿ\s.-]{2,80}$/.test(valor.trim())
      ? "Nombre de obra social inválido."
      : null;
  },
};

/* ───────── Hook: Obras Sociales ───────── */
function useObrasSociales() {
  const [listaObras, setListaObras] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const respuesta = await axios.get(
          "http://localhost:5000/api/obras-sociales/"
        );
        if (!activo) return;
        if (respuesta.data?.success && Array.isArray(respuesta.data.data)) {
          setListaObras(respuesta.data.data);
        } else if (Array.isArray(respuesta.data)) {
          setListaObras(respuesta.data);
        } else {
          console.warn("Respuesta inesperada obras:", respuesta.data);
        }
      } catch (error) {
        console.error("Error al obtener obras sociales:", error);
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  return { listaObras, cargando };
}

/* ───────── Componentes UI reutilizables ───────── */
const Campo = ({ id, etiqueta, error, children }) => (
  <div className="field">
    {etiqueta && (
      <label className="label-entrevista" htmlFor={id}>
        {etiqueta}
      </label>
    )}
    {children}
    {error && <span className="error-message">{error}</span>}
  </div>
);

const EntradaTexto = (props) => (
  <input {...props} className={`entrevista__input ${props.className || ""}`} />
);

const SelectorSiNo = ({ etiqueta, activo, onSi, onNo }) => (
  <div className="field">
    <label className="label-entrevista">{etiqueta}</label>
    <div className="entrevista__radio-group">
      <button
        type="button"
        className={`btn-opcion ${activo ? "activo" : ""}`}
        onClick={onSi}
      >
        Sí
      </button>
      <button
        type="button"
        className={`btn-opcion ${!activo ? "activo" : ""}`}
        onClick={onNo}
      >
        No
      </button>
    </div>
  </div>
);

const GrupoCheckbox = ({
  etiqueta,
  opciones,
  valoresSeleccionados,
  onCambiar,
}) => {
  const alternarSeleccion = (idOpcion) => {
    const conjunto = new Set(valoresSeleccionados);
    conjunto.has(idOpcion) ? conjunto.delete(idOpcion) : conjunto.add(idOpcion);
    onCambiar(Array.from(conjunto));
  };
  return (
    <div className="field">
      <label className="label-entrevista">{etiqueta}</label>
      <div className="checkbox-grid">
        {opciones.map((opcion) => (
          <label key={opcion.id} className="checkbox-item">
            <input
              type="checkbox"
              checked={valoresSeleccionados.includes(opcion.id)}
              onChange={() => alternarSeleccion(opcion.id)}
            />
            <span>{opcion.etiqueta}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

const SelectConOtra = ({
  id = "obra_social",
  etiqueta = "Obra social",
  obras,
  idSeleccionado,
  textoOtra,
  usarOtra,
  onSeleccionarId,
  onCambiarOtra,
  onPerderFocoOtra,
  error,
}) => (
  <div className="field">
    <label className="label-entrevista" htmlFor={id}>
      {etiqueta}
    </label>
    <select
      id={id}
      className="entrevista__input"
      value={usarOtra ? "otra" : idSeleccionado || ""}
      onChange={(evento) =>
        evento.target.value === "otra"
          ? onSeleccionarId(null, true)
          : onSeleccionarId(evento.target.value, false)
      }
      required
    >
      <option value="">-- Seleccionar --</option>
      {obras.map((obra) => (
        <option key={obra.id_obra_social} value={obra.id_obra_social}>
          {obra.nombre_obra_social || obra.nombre}
        </option>
      ))}
      <option value="otra">Otra</option>
    </select>

    {usarOtra && (
      <input
        className="entrevista__input"
        type="text"
        placeholder="Escriba su obra social"
        value={textoOtra || ""}
        onChange={(evento) => onCambiarOtra(evento.target.value)}
        onBlur={onPerderFocoOtra}
        required
      />
    )}
    {error && <span className="error-message">{error}</span>}
  </div>
);

/* ───────── Componente principal ───────── */
export default function FormularioEntrevista() {
  const { listaObras } = useObrasSociales();

  const { fechaMinima, fechaMaxima } = useMemo(() => {
    const hoy = new Date();
    const limiteMenor = new Date(
      hoy.getFullYear() - 18,
      hoy.getMonth(),
      hoy.getDate()
    );
    const aIsoLocal = (fecha) =>
      new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000)
        .toISOString()
        .split("T")[0];
    return { fechaMinima: aIsoLocal(limiteMenor), fechaMaxima: aIsoLocal(hoy) };
  }, []);

  const [datos, setDatos] = useState({
    nombre_nino: "",
    apellido_nino: "",
    fecha_nacimiento: "",
    dni_nino: "",
    certificado_discapacidad: false,
    tiene_obra_social: false,
    id_obra_social: "",
    obra_social_texto: "",
    nombre_responsable: "",
    apellido_responsable: "",
    telefono: "",
    email: "",
    parentesco: "",
    motivo_consulta: "",
    servicios: [],
    aceptar_terminos: false,
  });

  const usarOtraObra = datos.tiene_obra_social && !datos.id_obra_social;

  const actualizarCampo = useCallback((campo, valor) => {
    setDatos((estadoAnterior) => ({ ...estadoAnterior, [campo]: valor }));
  }, []);

  const alPerderFocoObra = () => {
    const textoNormalizado = normalizarTexto(datos.obra_social_texto || "");
    if (!textoNormalizado) return;
    const coincidencia = listaObras.find(
      (obra) =>
        normalizarTexto(obra.nombre_obra_social || obra.nombre || "") ===
        textoNormalizado
    );
    if (coincidencia) {
      actualizarCampo("id_obra_social", String(coincidencia.id_obra_social));
      actualizarCampo("obra_social_texto", "");
    }
  };

  const [errores, setErrores] = useState({});
  const validarTodo = () => {
    const hoy = new Date();
    const fechaMin = new Date(
      hoy.getFullYear() - 18,
      hoy.getMonth(),
      hoy.getDate()
    );
    const fechaMax = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    const nuevosErrores = {
      nombre_nino: VALIDADORES.nombre(datos.nombre_nino),
      apellido_nino: VALIDADORES.nombre(datos.apellido_nino),
      fecha_nacimiento: VALIDADORES.fechaEnRango(
        fechaMin,
        fechaMax
      )(datos.fecha_nacimiento),
      dni_nino: VALIDADORES.dni(datos.dni_nino),
      nombre_responsable: VALIDADORES.nombre(datos.nombre_responsable),
      apellido_responsable: VALIDADORES.nombre(datos.apellido_responsable),
      telefono: VALIDADORES.telefono(datos.telefono),
      email: VALIDADORES.email(datos.email),
      parentesco: VALIDADORES.requerido("Seleccione parentesco.")(
        datos.parentesco
      ),
      motivo_consulta: VALIDADORES.requerido("Motivo obligatorio.")(
        datos.motivo_consulta
      ),
      aceptar_terminos: datos.aceptar_terminos
        ? null
        : "Debe aceptar los términos.",
    };

    if (datos.tiene_obra_social) {
      if (usarOtraObra) {
        nuevosErrores.obra_social = VALIDADORES.obraSocialEscrita(
          datos.obra_social_texto
        );
      } else if (!datos.id_obra_social) {
        nuevosErrores.obra_social = "Seleccione la obra social.";
      }
    }

    Object.keys(nuevosErrores).forEach(
      (clave) => nuevosErrores[clave] == null && delete nuevosErrores[clave]
    );
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const enviarFormulario = async (evento) => {
    evento.preventDefault();
    if (!validarTodo()) return;

    const payloadNino = {
      nombre: datos.nombre_nino,
      apellido: datos.apellido_nino,
      fecha_nacimiento: datos.fecha_nacimiento || null,
      dni: datos.dni_nino || null,
      certificado_discapacidad: !!datos.certificado_discapacidad,
      id_obra_social:
        datos.tiene_obra_social && !usarOtraObra ? datos.id_obra_social : null,
      obra_social_texto:
        datos.tiene_obra_social && usarOtraObra
          ? datos.obra_social_texto
          : null,
      tipo: "candidato",
      responsable: {
        nombre: datos.nombre_responsable,
        apellido: datos.apellido_responsable,
        telefono: datos.telefono || null,
        email: datos.email || null,
        parentesco: datos.parentesco || null,
        dni: null,
      },
    };

    try {
      const respuesta = await axios.post(
        "http://localhost:5000/api/ninos",
        payloadNino
      );

      if (respuesta.data?.success) {
        Alerta.fire({
          icon: "success",
          title: "Enviado",
          text: "Formulario recibido. ¡Gracias!",
          confirmButtonColor: "#ff66b2",
        });
        setDatos({
          nombre_nino: "",
          apellido_nino: "",
          fecha_nacimiento: "",
          dni_nino: "",
          certificado_discapacidad: false,
          tiene_obra_social: false,
          id_obra_social: "",
          obra_social_texto: "",
          nombre_responsable: "",
          apellido_responsable: "",
          telefono: "",
          email: "",
          parentesco: "",
          motivo_consulta: "",
          servicios: [],
          aceptar_terminos: false,
        });
        setErrores({});
      } else {
        Alerta.fire({
          icon: "error",
          title: "Error",
          text: respuesta.data?.message || "Intente más tarde.",
        });
      }
    } catch (error) {
      console.error(error);
      Alerta.fire({
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
        onSubmit={enviarFormulario}
        className="entrevista__form"
        aria-label="Formulario de primera entrevista"
      >
        {/* Datos del niño/a */}
        <fieldset>
          <legend>Datos del niño/a</legend>

          <Campo
            id="nombre_nino"
            etiqueta="Nombre/s"
            error={errores.nombre_nino}
          >
            <EntradaTexto
              id="nombre_nino"
              name="nombre_nino"
              placeholder="Ej: Juan"
              value={datos.nombre_nino}
              onChange={(e) => actualizarCampo("nombre_nino", e.target.value)}
            />
          </Campo>

          <Campo
            id="apellido_nino"
            etiqueta="Apellido/s"
            error={errores.apellido_nino}
          >
            <EntradaTexto
              id="apellido_nino"
              name="apellido_nino"
              placeholder="Ej: Pérez"
              value={datos.apellido_nino}
              onChange={(e) => actualizarCampo("apellido_nino", e.target.value)}
            />
          </Campo>

          <Campo
            id="fecha_nacimiento"
            etiqueta="Fecha de nacimiento"
            error={errores.fecha_nacimiento}
          >
            <EntradaTexto
              id="fecha_nacimiento"
              type="date"
              name="fecha_nacimiento"
              min={fechaMinima}
              max={fechaMaxima}
              value={datos.fecha_nacimiento}
              onChange={(e) =>
                actualizarCampo("fecha_nacimiento", e.target.value)
              }
            />
          </Campo>

          <Campo
            id="dni_nino"
            etiqueta="DNI del niño/a"
            error={errores.dni_nino}
          >
            <EntradaTexto
              id="dni_nino"
              name="dni_nino"
              placeholder="Ej: 12345678"
              value={datos.dni_nino}
              onChange={(e) => actualizarCampo("dni_nino", e.target.value)}
            />
          </Campo>

          <SelectorSiNo
            etiqueta="¿El niño/a posee certificado de discapacidad?"
            activo={datos.certificado_discapacidad}
            onSi={() => actualizarCampo("certificado_discapacidad", true)}
            onNo={() => actualizarCampo("certificado_discapacidad", false)}
          />

          <SelectorSiNo
            etiqueta="¿El niño/a posee obra social?"
            activo={datos.tiene_obra_social}
            onSi={() => actualizarCampo("tiene_obra_social", true)}
            onNo={() => {
              actualizarCampo("tiene_obra_social", false);
              actualizarCampo("id_obra_social", "");
              actualizarCampo("obra_social_texto", "");
            }}
          />

          {datos.tiene_obra_social && (
            <SelectConOtra
              obras={listaObras}
              idSeleccionado={datos.id_obra_social}
              textoOtra={datos.obra_social_texto}
              usarOtra={usarOtraObra}
              onSeleccionarId={(idSeleccionado, esOtra) => {
                actualizarCampo("id_obra_social", idSeleccionado || "");
                if (!esOtra) actualizarCampo("obra_social_texto", "");
              }}
              onCambiarOtra={(valor) =>
                actualizarCampo("obra_social_texto", valor)
              }
              onPerderFocoOtra={alPerderFocoObra}
              error={errores.obra_social}
            />
          )}
        </fieldset>

        {/* Datos del responsable */}
        <fieldset>
          <legend>Datos del responsable</legend>

          <Campo
            id="nombre_responsable"
            etiqueta="Nombre/s"
            error={errores.nombre_responsable}
          >
            <EntradaTexto
              id="nombre_responsable"
              name="nombre_responsable"
              placeholder="Ej: María"
              value={datos.nombre_responsable}
              onChange={(e) =>
                actualizarCampo("nombre_responsable", e.target.value)
              }
            />
          </Campo>

          <Campo
            id="apellido_responsable"
            etiqueta="Apellido/s"
            error={errores.apellido_responsable}
          >
            <EntradaTexto
              id="apellido_responsable"
              name="apellido_responsable"
              placeholder="Ej: García"
              value={datos.apellido_responsable}
              onChange={(e) =>
                actualizarCampo("apellido_responsable", e.target.value)
              }
            />
          </Campo>

          <Campo id="telefono" etiqueta="Teléfono" error={errores.telefono}>
            <EntradaTexto
              id="telefono"
              name="telefono"
              placeholder="Ej: 1123456789"
              value={datos.telefono}
              onChange={(e) => actualizarCampo("telefono", e.target.value)}
            />
          </Campo>

          <Campo id="email" etiqueta="Email" error={errores.email}>
            <EntradaTexto
              id="email"
              name="email"
              placeholder="Ej: ejemplo@email.com"
              value={datos.email}
              onChange={(e) => actualizarCampo("email", e.target.value)}
            />
          </Campo>

          <Campo
            id="parentesco"
            etiqueta="Parentesco"
            error={errores.parentesco}
          >
            <select
              id="parentesco"
              className="entrevista__input"
              name="parentesco"
              value={datos.parentesco}
              onChange={(e) => actualizarCampo("parentesco", e.target.value)}
              required
            >
              <option value="">Seleccione una opción</option>
              <option value="madre">Madre</option>
              <option value="padre">Padre</option>
              <option value="tutor">Tutor</option>
              <option value="otro">Otro</option>
            </select>
          </Campo>
        </fieldset>

        {/* Motivo + Servicios */}
        <fieldset>
          <Campo
            id="motivo_consulta"
            etiqueta="Motivo de la consulta"
            error={errores.motivo_consulta}
          >
            <textarea
              id="motivo_consulta"
              name="motivo_consulta"
              className="entrevista__input"
              placeholder="Mi hijo tiene dificultades en..."
              value={datos.motivo_consulta}
              onChange={(e) =>
                actualizarCampo("motivo_consulta", e.target.value)
              }
              maxLength={250}
              required
            />
          </Campo>

          <GrupoCheckbox
            etiqueta="Servicios solicitados (puede elegir uno o varios)"
            opciones={SERVICIOS}
            valoresSeleccionados={datos.servicios}
            onCambiar={(seleccion) => actualizarCampo("servicios", seleccion)}
          />
          {errores.servicios && (
            <span className="error-message">{errores.servicios}</span>
          )}
        </fieldset>

        {/* Mensaje informativo de confidencialidad */}
        <div className="entrevista__mensaje-confidencialidad">
          <p>
            Toda la información proporcionada en este formulario será utilizada
            únicamente con fines terapéuticos y de evaluación profesional. Los
            datos se mantendrán bajo estricta confidencialidad, conforme a las
            normas de protección de datos personales.
          </p>
        </div>

        {/* Términos */}
        <div className="entrevista__terminos-container">
          <input
            id="aceptar_terminos"
            className="entrevista__checkbox"
            type="checkbox"
            checked={datos.aceptar_terminos}
            onChange={(e) =>
              actualizarCampo("aceptar_terminos", e.target.checked)
            }
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
