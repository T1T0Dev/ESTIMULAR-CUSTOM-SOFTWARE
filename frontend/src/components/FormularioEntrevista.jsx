import "../styles/FormularioEntrevista.css";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import API_BASE_URL from "../constants/api";
import {
  normalizePhone,
  isPhoneValid,
  PHONE_INPUT_HELPER,
} from "../utils/phone";
const Alerta = withReactContent(Swal);

/* ─────────────── Helpers ─────────────── */

const normalizeObraName = (value) =>
  value
    ? String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
    : "";

const VALIDADORES = {
  requerido:
    (mensaje = "Campo obligatorio.") =>
    (valor) =>
      !valor ? mensaje : null,
  nombre: (valor) =>
    !valor || !/^[a-zA-ZÀ-ÿ\s]{2,50}$/.test(valor)
      ? "Debe contener solo letras/espacios (2-50)."
      : null,
  dni: (valor) => {
    const limpio = String(valor || "").trim();
    if (!limpio) return "DNI obligatorio.";
    return /^\d{7,8}$/.test(limpio)
      ? null
      : "DNI inválido (7-8 dígitos).";
  },
  telefono: (valor) =>
    isPhoneValid(valor, { min: 7, max: 15 })
      ? null
      : "Teléfono inválido (7-15 dígitos).",
  email: (valor) =>
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor) ? "Correo inválido." : null,
  fechaEnRango: (minima, maxima) => (valor) => {
    if (!valor) return "Fecha obligatoria.";
    const fecha = new Date(valor);
    return fecha < minima || fecha > maxima
      ? "El niño/a debe tener hasta 18 años."
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
          `${API_BASE_URL}/api/obras-sociales/`
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

/* ───────── Hook: Profesiones ───────── */
function useProfesiones() {
  const [listaProfesiones, setListaProfesiones] = useState([]);
  const [cargandoProfesiones, setCargandoProfesiones] = useState(true);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const { data } = await axios.get(
          `${API_BASE_URL}/api/profesiones`
        );
        if (!activo) return;
        const registros = Array.isArray(data?.data) ? data.data : [];
        setListaProfesiones(registros);
      } catch (error) {
        console.error("Error al cargar profesiones", error);
        if (activo) setListaProfesiones([]);
      } finally {
        if (activo) setCargandoProfesiones(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  return { listaProfesiones, cargandoProfesiones };
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
  cargando = false,
  mensajeVacio = "No hay opciones disponibles.",
}) => {
  const seleccion = Array.isArray(valoresSeleccionados)
    ? valoresSeleccionados
    : [];
  const alternarSeleccion = (idOpcion) => {
    const conjunto = new Set(seleccion);
    conjunto.has(idOpcion) ? conjunto.delete(idOpcion) : conjunto.add(idOpcion);
    onCambiar(Array.from(conjunto));
  };
  const mensajeEstilo = {
    fontSize: 14,
    color: "var(--muted, #666)",
  };
  return (
    <div className="field">
      <label className="label-entrevista">{etiqueta}</label>
      <div className="checkbox-grid">
        {cargando ? (
          <span style={mensajeEstilo}>Cargando opciones…</span>
        ) : opciones.length === 0 ? (
          <span style={mensajeEstilo}>{mensajeVacio}</span>
        ) : (
          opciones.map((opcion) => (
            <label key={opcion.id} className="checkbox-item">
              <input
                type="checkbox"
                checked={seleccion.includes(opcion.id)}
                onChange={() => alternarSeleccion(opcion.id)}
              />
              <span>{opcion.etiqueta}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
};

/* ───────── Componente principal ───────── */
export default function FormularioEntrevista() {
  const { listaObras } = useObrasSociales();
  const { listaProfesiones, cargandoProfesiones } = useProfesiones();
  const [responsableExistente, setResponsableExistente] = useState(null);
  const [responsableLookupEstado, setResponsableLookupEstado] = useState("idle");
  const lookupResponsableRef = useRef({ dni: null, status: null, data: null, timeoutId: null });

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
    dni_responsable: "",
    nombre_responsable: "",
    apellido_responsable: "",
    telefono: "",
    email: "",
    parentesco: "",
    motivo_consulta: "",
    servicios: [],
    aceptar_terminos: false,
  });

  const obrasActivas = useMemo(() => {
    const lista = Array.isArray(listaObras) ? listaObras : [];
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
      const flags = [
        obra.activa,
        obra.activo,
        obra.habilitada,
        obra.habilitado,
      ];
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
  }, [listaObras]);

  const matchedObra = useMemo(() => {
    if (!datos.id_obra_social) return null;
    const targetId = String(datos.id_obra_social);
    return (
      obrasActivas.find((obra) => {
        const obraId = obra?.id_obra_social ?? obra?.id ?? obra?.uuid;
        return (
          obraId !== undefined &&
          obraId !== null &&
          String(obraId) === targetId
        );
      }) || null
    );
  }, [datos.id_obra_social, obrasActivas]);

  const obraInputValue = useMemo(() => {
    if (matchedObra?.nombre_obra_social) return matchedObra.nombre_obra_social;
    if (matchedObra?.nombre) return matchedObra.nombre;
    return datos.obra_social_texto || "";
  }, [matchedObra, datos.obra_social_texto]);

  const obraManualNombre = useMemo(
    () => (datos.id_obra_social ? "" : (datos.obra_social_texto || "").trim()),
    [datos.id_obra_social, datos.obra_social_texto]
  );

  const usarOtraObra = datos.tiene_obra_social && !datos.id_obra_social;

  const handleObraInputChange = useCallback(
    (valor) => {
      const texto = valor ?? "";
      const normalizado = normalizeObraName(texto);
      setDatos((prev) => {
        if (!normalizado) {
          if (!prev.id_obra_social && !prev.obra_social_texto) return prev;
          return {
            ...prev,
            id_obra_social: "",
            obra_social_texto: "",
          };
        }
        const coincidencia = obrasActivas.find((obra) => {
          const nombre = normalizeObraName(
            obra?.nombre_obra_social || obra?.nombre || ""
          );
          return nombre && nombre === normalizado;
        });
        if (coincidencia) {
          const obraId =
            coincidencia.id_obra_social ??
            coincidencia.id ??
            coincidencia.uuid ??
            "";
          const obraIdStr =
            obraId !== undefined && obraId !== null ? String(obraId) : "";
          if (prev.id_obra_social === obraIdStr && prev.obra_social_texto === "")
            return prev;
          return {
            ...prev,
            id_obra_social: obraIdStr,
            obra_social_texto: "",
          };
        }
        if (prev.id_obra_social === "" && prev.obra_social_texto === texto)
          return prev;
        return {
          ...prev,
          id_obra_social: "",
          obra_social_texto: texto,
        };
      });
    },
    [obrasActivas]
  );

  const handleObraBlur = useCallback(
    (valor) => {
      handleObraInputChange((valor ?? "").trim());
    },
    [handleObraInputChange]
  );

  const serviciosOpciones = useMemo(() => {
    const registros = Array.isArray(listaProfesiones) ? listaProfesiones : [];
    return registros
      .map((prof) => ({
        id: String(prof.id_departamento ?? prof.id ?? ""),
        etiqueta: prof.nombre || "Profesión sin nombre",
      }))
      .filter((opt) => opt.id && opt.etiqueta)
      .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es"));
  }, [listaProfesiones]);

  const actualizarCampo = useCallback((campo, valor) => {
    setDatos((estadoAnterior) => ({ ...estadoAnterior, [campo]: valor }));
  }, []);

  useEffect(() => {
    if (!serviciosOpciones.length) return;
    setDatos((prev) => {
      if (!Array.isArray(prev.servicios) || prev.servicios.length === 0) {
        return prev;
      }
      const validos = new Set(serviciosOpciones.map((opt) => opt.id));
      const filtrados = prev.servicios
        .map((id) => String(id))
        .filter((id) => validos.has(id));
      if (filtrados.length === prev.servicios.length) {
        return prev;
      }
      return { ...prev, servicios: filtrados };
    });
  }, [serviciosOpciones]);

  useEffect(() => {
    const dniCrudo = String(datos.dni_responsable || "").trim();
    const dniLimpio = dniCrudo.replace(/\D/g, "");

    if (dniLimpio !== datos.dni_responsable) {
      setDatos((prev) => ({ ...prev, dni_responsable: dniLimpio }));
      return;
    }

    if (!dniLimpio) {
      setResponsableExistente(null);
      setResponsableLookupEstado("idle");
      lookupResponsableRef.current = { dni: null, status: null, data: null, timeoutId: null };
      return;
    }

    if (dniLimpio.length < 7) {
      setResponsableExistente(null);
      setResponsableLookupEstado("typing");
      if (lookupResponsableRef.current.timeoutId) {
        clearTimeout(lookupResponsableRef.current.timeoutId);
        lookupResponsableRef.current.timeoutId = null;
      }
      lookupResponsableRef.current = { dni: dniLimpio, status: "typing", data: null, timeoutId: null };
      return;
    }

    if (
      lookupResponsableRef.current.dni === dniLimpio &&
      lookupResponsableRef.current.status &&
      lookupResponsableRef.current.status !== "loading"
    ) {
      setResponsableLookupEstado(lookupResponsableRef.current.status);
      setResponsableExistente(lookupResponsableRef.current.data);
      return;
    }

    if (lookupResponsableRef.current.timeoutId) {
      clearTimeout(lookupResponsableRef.current.timeoutId);
    }

    setResponsableLookupEstado("loading");
    lookupResponsableRef.current = {
      dni: dniLimpio,
      status: "loading",
      data: null,
      timeoutId: null,
    };

    let cancelado = false;
    const timeoutId = setTimeout(async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/responsables`, {
          params: { dni: dniLimpio },
        });
        if (cancelado) return;
        const items = Array.isArray(data?.data) ? data.data : [];
        if (items.length > 0) {
          const existente = items[0];
          const telefonoNormalizado = normalizePhone(existente.telefono);
          lookupResponsableRef.current = {
            dni: dniLimpio,
            status: "found",
            data: existente,
            timeoutId: null,
          };
          setResponsableExistente(existente);
          setResponsableLookupEstado("found");
          setDatos((prev) => ({
            ...prev,
            nombre_responsable:
              existente.nombre || prev.nombre_responsable || "",
            apellido_responsable:
              existente.apellido || prev.apellido_responsable || "",
            telefono: telefonoNormalizado || prev.telefono || "",
            email: existente.email || prev.email || "",
          }));
        } else {
          lookupResponsableRef.current = {
            dni: dniLimpio,
            status: "missing",
            data: null,
            timeoutId: null,
          };
          setResponsableExistente(null);
          setResponsableLookupEstado("missing");
        }
      } catch (error) {
        console.warn("Error al buscar responsable", error?.message || error);
        if (cancelado) return;
        lookupResponsableRef.current = {
          dni: dniLimpio,
          status: "error",
          data: null,
          timeoutId: null,
        };
        setResponsableLookupEstado("error");
      }
    }, 600);

    lookupResponsableRef.current.timeoutId = timeoutId;

    return () => {
      cancelado = true;
      clearTimeout(timeoutId);
      lookupResponsableRef.current.timeoutId = null;
    };
  }, [datos.dni_responsable]);

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
      dni_responsable: VALIDADORES.dni(datos.dni_responsable),
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

    if (
      !cargandoProfesiones &&
      serviciosOpciones.length > 0 &&
      (!Array.isArray(datos.servicios) || datos.servicios.length === 0)
    ) {
      nuevosErrores.servicios = "Seleccione al menos un servicio.";
    }

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

  // Navegación por pasos (pantallas sin scroll)
  const PASOS = 5;
  const [paso, setPaso] = useState(1);
  const progreso = Math.round((paso / PASOS) * 100);

  const validarPaso = (p) => {
    const hoy = new Date();
    const fechaMin = new Date(
      hoy.getFullYear() - 18,
      hoy.getMonth(),
      hoy.getDate()
    );
    const fechaMax = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const e = {};
    if (p === 1) {
      e.nombre_nino = VALIDADORES.nombre(datos.nombre_nino);
      e.apellido_nino = VALIDADORES.nombre(datos.apellido_nino);
      e.fecha_nacimiento = VALIDADORES.fechaEnRango(
        fechaMin,
        fechaMax
      )(datos.fecha_nacimiento);
      e.dni_nino = VALIDADORES.dni(datos.dni_nino);
    } else if (p === 2) {
      if (datos.tiene_obra_social) {
        if (usarOtraObra) {
          e.obra_social = VALIDADORES.obraSocialEscrita(
            datos.obra_social_texto
          );
        } else if (!datos.id_obra_social) {
          e.obra_social = "Seleccione la obra social.";
        }
      }
    } else if (p === 3) {
      e.dni_responsable = VALIDADORES.dni(datos.dni_responsable);
      e.nombre_responsable = VALIDADORES.nombre(datos.nombre_responsable);
      e.apellido_responsable = VALIDADORES.nombre(datos.apellido_responsable);
      e.telefono = VALIDADORES.telefono(datos.telefono);
      e.email = VALIDADORES.email(datos.email);
      e.parentesco = VALIDADORES.requerido("Seleccione parentesco.")(
        datos.parentesco
      );
    } else if (p === 4) {
      e.motivo_consulta = VALIDADORES.requerido("Motivo obligatorio.")(
        datos.motivo_consulta
      );
      if (
        !cargandoProfesiones &&
        serviciosOpciones.length > 0 &&
        (!Array.isArray(datos.servicios) || datos.servicios.length === 0)
      ) {
        e.servicios = "Seleccione al menos un servicio.";
      }
    } else if (p === 5) {
      if (!datos.aceptar_terminos)
        e.aceptar_terminos = "Debe aceptar los términos.";
    }
    Object.keys(e).forEach((k) => e[k] == null && delete e[k]);
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const siguiente = () => {
    if (paso < PASOS && validarPaso(paso)) setPaso((p) => p + 1);
  };
  const anterior = () => setPaso((p) => Math.max(1, p - 1));

  const enviarFormulario = async (evento) => {
    evento.preventDefault();
    if (paso < PASOS) {
      // avanzar de paso con submit (enter)
      if (validarPaso(paso)) setPaso((p) => p + 1);
      return;
    }
    if (!validarTodo()) return;

    const obraIdParsed =
      datos.tiene_obra_social && datos.id_obra_social
        ? Number.parseInt(datos.id_obra_social, 10)
        : null;

    const payloadNino = {
      nombre: datos.nombre_nino,
      apellido: datos.apellido_nino,
      fecha_nacimiento: datos.fecha_nacimiento || null,
      dni: datos.dni_nino || null,
      certificado_discapacidad: !!datos.certificado_discapacidad,
      motivo_consulta: (datos.motivo_consulta || "").trim() || null,
      id_obra_social:
        datos.tiene_obra_social && !usarOtraObra
          ? !Number.isNaN(obraIdParsed) && obraIdParsed !== null
            ? obraIdParsed
            : null
          : null,
      obra_social_texto:
        datos.tiene_obra_social && usarOtraObra
          ? (datos.obra_social_texto || "").trim() || null
          : null,
      tipo: "candidato",
      responsable: {
        nombre: datos.nombre_responsable,
        apellido: datos.apellido_responsable,
        telefono: datos.telefono
          ? normalizePhone(datos.telefono)
          : null,
        email: datos.email || null,
        parentesco: datos.parentesco || null,
        dni: datos.dni_responsable || null,
      },
    };

    try {
      const respuesta = await axios.post(
        `${API_BASE_URL}/api/ninos`,
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
          dni_responsable: "",
          nombre_responsable: "",
          apellido_responsable: "",
          telefono: "",
          email: "",
          parentesco: "",
          motivo_consulta: "",
          servicios: [],
          aceptar_terminos: false,
        });
        setResponsableExistente(null);
        lookupResponsableRef.current = { dni: null, status: null };
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
    <section className="entrevista__formulario entrevista__screen">
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
        {/* Indicador de progreso */}
        <div
          className="entrevista__progreso"
          aria-label={`Progreso: paso ${paso} de ${PASOS}`}
        >
          <div className="entrevista__progreso-bar">
            <div
              className="entrevista__progreso-fill"
              style={{ width: `${progreso}%` }}
            />
          </div>
          <div
            className="entrevista__pasos-dots"
            role="tablist"
            aria-label="Pasos del formulario"
          >
            {Array.from({ length: PASOS }).map((_, i) => {
              const n = i + 1;
              const active = n === paso;
              const completed = n < paso;
              return (
                <button
                  key={n}
                  type="button"
                  className={`paso-dot ${active ? "activo" : ""} ${
                    completed ? "completado" : ""
                  }`}
                  aria-current={active ? "step" : undefined}
                  aria-label={`Paso ${n} de ${PASOS}`}
                  onClick={() => setPaso(n)}
                />
              );
            })}
          </div>
        </div>
        {/* contenido del paso */}
        <div className="entrevista__contenido">
          {paso === 1 && (
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
                  onChange={(e) =>
                    actualizarCampo("nombre_nino", e.target.value)
                  }
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
                  onChange={(e) =>
                    actualizarCampo("apellido_nino", e.target.value)
                  }
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
            </fieldset>
          )}

          {paso === 2 && (
            <fieldset>
              <legend>Obra social</legend>
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
                <Campo
                  id="obra_social"
                  etiqueta="Obra social"
                  error={errores.obra_social}
                >
                  <input
                    id="obra_social"
                    className="entrevista__input"
                    type="text"
                    list="obras-sociales-activas"
                    placeholder="Buscá o escribí una obra social"
                    value={obraInputValue}
                    onChange={(e) => handleObraInputChange(e.target.value)}
                    onBlur={(e) => handleObraBlur(e.target.value)}
                  />
                  <datalist id="obras-sociales-activas">
                    {obrasActivas
                      .filter(
                        (obra) =>
                          (obra?.nombre_obra_social || obra?.nombre || "")
                            .trim().length > 0
                      )
                      .map((obra) => {
                        const nombre =
                          (obra?.nombre_obra_social || obra?.nombre || "")
                            .trim();
                        const optionKey = String(
                          obra?.id_obra_social ??
                            obra?.id ??
                            obra?.uuid ??
                            nombre
                        );
                        return <option key={optionKey} value={nombre} />;
                      })}
                  </datalist>
                  <span className="muted">
                    Seleccioná una obra social existente o escribí una nueva.
                    Las nuevas se registrarán como pendientes.
                  </span>
                  {usarOtraObra && obraManualNombre ? (
                    <span className="muted">
                      Se registrará "{obraManualNombre}" como pendiente.
                    </span>
                  ) : null}
                </Campo>
              )}
            </fieldset>
          )}

          {paso === 3 && (
            <fieldset>
              <legend>Datos del responsable</legend>
              <Campo
                id="dni_responsable"
                etiqueta="DNI del responsable"
                error={errores.dni_responsable}
              >
                <EntradaTexto
                  id="dni_responsable"
                  name="dni_responsable"
                  placeholder="Ej: 44028630"
                  value={datos.dni_responsable}
                  onChange={(e) =>
                    actualizarCampo(
                      "dni_responsable",
                      e.target.value.replace(/\D/g, "").slice(0, 8)
                    )
                  }
                />
                {responsableLookupEstado === "loading" && (
                  <span className="muted" style={{ display: "block", marginTop: "0.3rem" }}>
                    Buscando responsable…
                  </span>
                )}
                {responsableLookupEstado === "missing" && (
                  <span className="muted" style={{ display: "block", marginTop: "0.3rem" }}>
                    No encontramos un responsable con ese DNI. Completa los datos para registrarlo.
                  </span>
                )}
                {responsableLookupEstado === "error" && (
                  <span className="error-message" style={{ display: "block", marginTop: "0.3rem" }}>
                    No pudimos verificar el DNI. Intentá nuevamente.
                  </span>
                )}
              </Campo>
              {responsableExistente && (
                <div
                  className="entrevista__responsable-existente"
                  style={{
                    background: "var(--bg-muted, #f7f7f7)",
                    borderRadius: "8px",
                    padding: "0.75rem 1rem",
                    marginBottom: "1rem",
                    color: "var(--text-muted, #444)",
                  }}
                >
                  <strong>
                    {`¡Qué bueno verte, ${
                      [
                        responsableExistente.nombre,
                        responsableExistente.apellido,
                      ]
                        .filter(Boolean)
                        .join(" ") || "de nuevo"
                    }!`}
                  </strong>
                  <p style={{ margin: "0.35rem 0 0" }}>
                    Encontramos tus datos y los completamos automáticamente.
                  </p>
                </div>
              )}
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
                  onChange={(e) =>
                    actualizarCampo(
                      "telefono",
                      normalizePhone(e.target.value)
                    )
                  }
                />
                <small
                  className="muted"
                  style={{ display: "block", marginTop: "0.25rem" }}
                >
                  {PHONE_INPUT_HELPER}
                </small>
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
                  onChange={(e) =>
                    actualizarCampo("parentesco", e.target.value)
                  }
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
          )}

          {paso === 4 && (
            <fieldset>
              <legend>Motivo y servicios</legend>
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
                opciones={serviciosOpciones}
                valoresSeleccionados={datos.servicios}
                cargando={cargandoProfesiones}
                mensajeVacio="No hay servicios configurados en este momento."
                onCambiar={(seleccion) =>
                  actualizarCampo("servicios", seleccion)
                }
              />
              {errores.servicios && (
                <span className="error-message">{errores.servicios}</span>
              )}
            </fieldset>
          )}

          {paso === 5 && (
            <fieldset>
              <legend>Términos</legend>
              <div className="entrevista__mensaje-confidencialidad">
                <p>
                  Toda la información proporcionada en este formulario será
                  utilizada únicamente con fines terapéuticos y de evaluación
                  profesional. Los datos se mantendrán bajo estricta
                  confidencialidad, conforme a las normas de protección de datos
                  personales.
                </p>
              </div>
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
                <span className="error-message">
                  {errores.aceptar_terminos}
                </span>
              )}
            </fieldset>
          )}
        </div>

        {/* Navegación inferior */}
        <div className="entrevista__nav">
          <button
            type="button"
            className="btn-nav btn-outline"
            onClick={anterior}
            disabled={paso === 1}
          >
            Atrás
          </button>
          {paso < PASOS ? (
            <button type="button" className="btn-nav" onClick={siguiente}>
              Siguiente
            </button>
          ) : (
            <button type="submit" className="btn-nav">
              Enviar
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
