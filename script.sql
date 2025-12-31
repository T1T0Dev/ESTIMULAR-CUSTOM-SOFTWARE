-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.consultorios (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre character varying NOT NULL UNIQUE,
  ubicacion character varying,
  CONSTRAINT consultorios_pkey PRIMARY KEY (id)
);
CREATE TABLE public.entrevista_cita_resultados (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  cita_id bigint NOT NULL,
  resultado text NOT NULL,
  informe text,
  registrado_por bigint,
  registrado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT entrevista_cita_resultados_pkey PRIMARY KEY (id),
  CONSTRAINT entrevista_cita_resultados_cita_id_fkey FOREIGN KEY (cita_id) REFERENCES public.entrevista_citas(id),
  CONSTRAINT entrevista_cita_resultados_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.entrevista_citas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  departamento_id bigint NOT NULL,
  profesional_id bigint NOT NULL,
  inicio timestamp with time zone NOT NULL,
  fin timestamp with time zone NOT NULL,
  consultorio_id bigint,
  modalidad text NOT NULL DEFAULT 'individual'::text,
  estado text NOT NULL DEFAULT 'pendiente'::text,
  observaciones text,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  actualizado_en timestamp with time zone NOT NULL DEFAULT now(),
  nino_id bigint,
  CONSTRAINT entrevista_citas_pkey PRIMARY KEY (id),
  CONSTRAINT entrevista_citas_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES public.profesiones(id_departamento),
  CONSTRAINT entrevista_citas_consultorio_id_fkey FOREIGN KEY (consultorio_id) REFERENCES public.consultorios(id),
  CONSTRAINT entrevista_citas_nino_id_fkey FOREIGN KEY (nino_id) REFERENCES public.ninos(id_nino)
);
CREATE TABLE public.nino_departamentos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nino_id bigint NOT NULL,
  departamento_id bigint NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente'::text,
  profesional_asignado_id bigint,
  notas text,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  actualizado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT nino_departamentos_pkey PRIMARY KEY (id),
  CONSTRAINT candidato_departamentos_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES public.profesiones(id_departamento),
  CONSTRAINT nino_departamentos_nino_id_fkey FOREIGN KEY (nino_id) REFERENCES public.ninos(id_nino)
);
CREATE TABLE public.nino_responsables (
  id_nino_responsable bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_nino bigint NOT NULL,
  id_responsable bigint NOT NULL,
  parentesco character varying NOT NULL,
  es_principal boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT nino_responsables_pkey PRIMARY KEY (id_nino_responsable),
  CONSTRAINT nino_responsables_id_nino_fkey FOREIGN KEY (id_nino) REFERENCES public.ninos(id_nino),
  CONSTRAINT nino_responsables_id_responsable_fkey FOREIGN KEY (id_responsable) REFERENCES public.responsables(id_responsable)
);
CREATE TABLE public.ninos (
  id_nino bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_obra_social bigint,
  nombre text NOT NULL,
  apellido text NOT NULL,
  fecha_nacimiento date NOT NULL,
  dni character varying UNIQUE,
  certificado_discapacidad boolean NOT NULL DEFAULT false,
  tipo text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  actualizado_en timestamp with time zone NOT NULL DEFAULT now(),
  activo boolean NOT NULL DEFAULT true,
  foto_perfil text,
  CONSTRAINT ninos_pkey PRIMARY KEY (id_nino),
  CONSTRAINT ninos_id_obra_social_fkey FOREIGN KEY (id_obra_social) REFERENCES public.obras_sociales(id_obra_social)
);
CREATE TABLE public.notificaciones (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  profesional_id bigint NOT NULL,
  mensaje text NOT NULL,
  turno_id bigint,
  leida boolean NOT NULL DEFAULT false,
  creada_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notificaciones_pkey PRIMARY KEY (id),
  CONSTRAINT notificaciones_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.turnos(id)
);
CREATE TABLE public.obras_sociales (
  id_obra_social bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre_obra_social text NOT NULL UNIQUE,
  estado text NOT NULL DEFAULT 'pendiente'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT obras_sociales_pkey PRIMARY KEY (id_obra_social)
);
CREATE TABLE public.pagos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  turno_id bigint NOT NULL,
  monto numeric NOT NULL,
  moneda text NOT NULL DEFAULT 'ARS'::text,
  metodo text NOT NULL DEFAULT 'efectivo'::text,
  estado text NOT NULL DEFAULT 'pendiente'::text,
  notas text,
  registrado_en timestamp with time zone NOT NULL DEFAULT now(),
  actualizado_en timestamp with time zone NOT NULL DEFAULT now(),
  nino_id bigint,
  CONSTRAINT pagos_pkey PRIMARY KEY (id),
  CONSTRAINT pagos_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.turnos(id),
  CONSTRAINT pagos_nino_id_fkey FOREIGN KEY (nino_id) REFERENCES public.ninos(id_nino)
);
CREATE TABLE public.personas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL,
  apellido text NOT NULL,
  telefono text,
  email text UNIQUE,
  fecha_nacimiento date,
  foto_perfil text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT personas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profesional_departamentos (
  profesional_id bigint NOT NULL,
  departamento_id bigint NOT NULL,
  CONSTRAINT profesional_departamentos_pkey PRIMARY KEY (profesional_id, departamento_id),
  CONSTRAINT profesional_departamentos_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES public.profesiones(id_departamento)
);
CREATE TABLE public.profesiones (
  id_departamento bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre character varying NOT NULL UNIQUE,
  duracion_default_min integer NOT NULL DEFAULT 30,
  descripcion text,
  responsable_id bigint,
  CONSTRAINT profesiones_pkey PRIMARY KEY (id_departamento)
);
CREATE TABLE public.responsables (
  id_responsable bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL,
  apellido text NOT NULL,
  telefono text,
  email text,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  dni bigint,
  activo boolean NOT NULL DEFAULT true,
  CONSTRAINT responsables_pkey PRIMARY KEY (id_responsable)
);
CREATE TABLE public.roles (
  id_rol bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre_rol character varying NOT NULL UNIQUE,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id_rol)
);
CREATE TABLE public.turno_profesionales (
  turno_id bigint NOT NULL,
  profesional_id bigint NOT NULL,
  rol_en_turno character varying NOT NULL DEFAULT 'responsable'::character varying,
  CONSTRAINT turno_profesionales_pkey PRIMARY KEY (profesional_id, turno_id),
  CONSTRAINT turno_profesionales_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.turnos(id)
);
CREATE TABLE public.turnos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  departamento_id bigint NOT NULL,
  inicio timestamp with time zone NOT NULL,
  fin timestamp with time zone NOT NULL,
  duracion_min integer NOT NULL,
  consultorio_id bigint,
  estado text NOT NULL DEFAULT 'pendiente'::text,
  creado_por bigint,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  actualizado_en timestamp with time zone NOT NULL DEFAULT now(),
  notas text,
  nino_id bigint,
  CONSTRAINT turnos_pkey PRIMARY KEY (id),
  CONSTRAINT turnos_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES public.profesiones(id_departamento),
  CONSTRAINT turnos_consultorio_id_fkey FOREIGN KEY (consultorio_id) REFERENCES public.consultorios(id),
  CONSTRAINT turnos_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT turnos_nino_id_fkey FOREIGN KEY (nino_id) REFERENCES public.ninos(id_nino)
);
CREATE TABLE public.usuario_roles (
  usuario_id bigint NOT NULL,
  rol_id bigint NOT NULL,
  asignado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT usuario_roles_pkey PRIMARY KEY (usuario_id, rol_id),
  CONSTRAINT usuario_roles_v2_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT usuario_roles_v2_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id_rol)
);
CREATE TABLE public.usuarios (
  id_usuario bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  dni bigint UNIQUE,
  password_hash character varying,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  actualizado_en timestamp with time zone NOT NULL DEFAULT now(),
  persona_id bigint UNIQUE,
  CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario),
  CONSTRAINT usuarios_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES public.personas(id)
);