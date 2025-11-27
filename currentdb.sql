create table public.consultorios (
  id bigint generated always as identity not null,
  nombre character varying not null,
  ubicacion character varying null,
  constraint consultorios_pkey primary key (id),
  constraint consultorios_nombre_key unique (nombre)
) TABLESPACE pg_default;
create table public.entrevista_cita_resultados (
  id bigint generated always as identity not null,
  cita_id bigint not null,
  resultado text not null,
  informe text null,
  registrado_por bigint null,
  registrado_en timestamp with time zone not null default now(),
  constraint entrevista_cita_resultados_pkey primary key (id),
  constraint entrevista_cita_resultados_cita_id_fkey foreign KEY (cita_id) references entrevista_citas (id),
  constraint entrevista_cita_resultados_registrado_por_fkey foreign KEY (registrado_por) references usuarios (id_usuario)
) TABLESPACE pg_default;
create table public.entrevista_citas (
  id bigint generated always as identity not null,
  departamento_id bigint not null,
  profesional_id bigint not null,
  inicio timestamp with time zone not null,
  fin timestamp with time zone not null,
  consultorio_id bigint null,
  modalidad text not null default 'individual'::text,
  estado text not null default 'pendiente'::text,
  observaciones text null,
  creado_en timestamp with time zone not null default now(),
  actualizado_en timestamp with time zone not null default now(),
  nino_id bigint null,
  constraint entrevista_citas_pkey primary key (id),
  constraint entrevista_citas_consultorio_id_fkey foreign KEY (consultorio_id) references consultorios (id),
  constraint entrevista_citas_departamento_id_fkey foreign KEY (departamento_id) references profesiones (id_departamento),
  constraint entrevista_citas_nino_id_fkey foreign KEY (nino_id) references ninos (id_nino),
  constraint entrevista_citas_profesional_id_fkey foreign KEY (profesional_id) references usuarios (id_usuario)
) TABLESPACE pg_default;
create table public.nino_departamentos (
  id bigint generated always as identity not null,
  nino_id bigint not null,
  departamento_id bigint not null,
  estado text not null default 'pendiente'::text,
  profesional_asignado_id bigint null,
  notas text null,
  creado_en timestamp with time zone not null default now(),
  actualizado_en timestamp with time zone not null default now(),
  constraint nino_departamentos_pkey primary key (id),
  constraint candidato_departamentos_departamento_id_fkey foreign KEY (departamento_id) references profesiones (id_departamento),
  constraint nino_departamentos_nino_id_fkey foreign KEY (nino_id) references ninos (id_nino)
) TABLESPACE pg_default;
create table public.nino_responsables (
  id_nino_responsable bigint generated always as identity not null,
  id_nino bigint not null,
  id_responsable bigint not null,
  parentesco character varying not null,
  es_principal boolean not null default false,
  created_at timestamp with time zone not null default now(),
  constraint nino_responsables_pkey primary key (id_nino_responsable),
  constraint nino_responsables_id_nino_fkey foreign KEY (id_nino) references ninos (id_nino),
  constraint nino_responsables_id_responsable_fkey foreign KEY (id_responsable) references responsables (id_responsable)
) TABLESPACE pg_default;
create table public.ninos (
  id_nino bigint generated always as identity not null,
  id_obra_social bigint null,
  nombre text not null,
  apellido text not null,
  fecha_nacimiento date not null,
  dni character varying null,
  certificado_discapacidad boolean not null default false,
  tipo text not null,
  created_at timestamp with time zone not null default now(),
  actualizado_en timestamp with time zone not null default now(),
  activo boolean not null default true,
  foto_perfil text null,
  motivo_consulta text null,
  constraint ninos_pkey primary key (id_nino),
  constraint ninos_dni_key unique (dni),
  constraint ninos_id_obra_social_fkey foreign KEY (id_obra_social) references obras_sociales (id_obra_social)
) TABLESPACE pg_default;
create table public.notificaciones (
  id bigint generated always as identity not null,
  profesional_id bigint not null,
  mensaje text not null,
  turno_id bigint null,
  leida boolean not null default false,
  creada_en timestamp with time zone not null default now(),
  constraint notificaciones_pkey primary key (id),
  constraint notificaciones_turno_id_fkey foreign KEY (turno_id) references turnos (id) on delete set null
) TABLESPACE pg_default;
create table public.obras_sociales (
  id_obra_social bigint generated always as identity not null,
  nombre_obra_social text not null,
  estado text not null default 'pendiente'::text,
  created_at timestamp with time zone not null default now(),
  descuento real null,
  constraint obras_sociales_pkey primary key (id_obra_social),
  constraint obras_sociales_nombre_obra_social_key unique (nombre_obra_social)
) TABLESPACE pg_default;create table public.obras_sociales (
  id_obra_social bigint generated always as identity not null,
  nombre_obra_social text not null,
  estado text not null default 'pendiente'::text,
  created_at timestamp with time zone not null default now(),
  descuento real null,
  constraint obras_sociales_pkey primary key (id_obra_social),
  constraint obras_sociales_nombre_obra_social_key unique (nombre_obra_social)
) TABLESPACE pg_default;create table public.obras_sociales (
  id_obra_social bigint generated always as identity not null,
  nombre_obra_social text not null,
  estado text not null default 'pendiente'::text,
  created_at timestamp with time zone not null default now(),
  descuento real null,
  constraint obras_sociales_pkey primary key (id_obra_social),
  constraint obras_sociales_nombre_obra_social_key unique (nombre_obra_social)
) TABLESPACE pg_default;create table public.obras_sociales (
  id_obra_social bigint generated always as identity not null,
  nombre_obra_social text not null,
  estado text not null default 'pendiente'::text,
  created_at timestamp with time zone not null default now(),
  descuento real null,
  constraint obras_sociales_pkey primary key (id_obra_social),
  constraint obras_sociales_nombre_obra_social_key unique (nombre_obra_social)
) TABLESPACE pg_default;create table public.obras_sociales (
  id_obra_social bigint generated always as identity not null,
  nombre_obra_social text not null,
  estado text not null default 'pendiente'::text,
  created_at timestamp with time zone not null default now(),
  descuento real null,
  constraint obras_sociales_pkey primary key (id_obra_social),
  constraint obras_sociales_nombre_obra_social_key unique (nombre_obra_social)
) TABLESPACE pg_default;create table public.obras_sociales (
  id_obra_social bigint generated always as identity not null,
  nombre_obra_social text not null,
  estado text not null default 'pendiente'::text,
  created_at timestamp with time zone not null default now(),
  descuento real null,
  constraint obras_sociales_pkey primary key (id_obra_social),
  constraint obras_sociales_nombre_obra_social_key unique (nombre_obra_social)
) TABLESPACE pg_default;create table public.obras_sociales (
  id_obra_social bigint generated always as identity not null,
  nombre_obra_social text not null,
  estado text not null default 'pendiente'::text,
  created_at timestamp with time zone not null default now(),
  descuento real null,
  constraint obras_sociales_pkey primary key (id_obra_social),
  constraint obras_sociales_nombre_obra_social_key unique (nombre_obra_social)
) TABLESPACE pg_default;create table public.obras_sociales (
  id_obra_social bigint generated always as identity not null,
  nombre_obra_social text not null,
  estado text not null default 'pendiente'::text,
  created_at timestamp with time zone not null default now(),
  descuento real null,
  constraint obras_sociales_pkey primary key (id_obra_social),
  constraint obras_sociales_nombre_obra_social_key unique (nombre_obra_social)
) TABLESPACE pg_default;create table public.obras_sociales (
  id_obra_social bigint generated always as identity not null,
  nombre_obra_social text not null,
  estado text not null default 'pendiente'::text,
  created_at timestamp with time zone not null default now(),
  descuento real null,
  constraint obras_sociales_pkey primary key (id_obra_social),
  constraint obras_sociales_nombre_obra_social_key unique (nombre_obra_social)
) TABLESPACE pg_default;create table public.obras_sociales (
  id_obra_social bigint generated always as identity not null,
  nombre_obra_social text not null,
  estado text not null default 'pendiente'::text,
  created_at timestamp with time zone not null default now(),
  descuento real null,
  constraint obras_sociales_pkey primary key (id_obra_social),
  constraint obras_sociales_nombre_obra_social_key unique (nombre_obra_social)
) TABLESPACE pg_default;create table public.obras_sociales (
  id_obra_social bigint generated always as identity not null,
  nombre_obra_social text not null,
  estado text not null default 'pendiente'::text,
  created_at timestamp with time zone not null default now(),
  descuento real null,
  constraint obras_sociales_pkey primary key (id_obra_social),
  constraint obras_sociales_nombre_obra_social_key unique (nombre_obra_social)
) TABLESPACE pg_default;
create table public.obras_sociales (
  id_obra_social bigint generated always as identity not null,
  nombre_obra_social text not null,
  estado text not null default 'pendiente'::text,
  created_at timestamp with time zone not null default now(),
  descuento real null,
  constraint obras_sociales_pkey primary key (id_obra_social),
  constraint obras_sociales_nombre_obra_social_key unique (nombre_obra_social)
) TABLESPACE pg_default;
create table public.pagos (
  id bigint generated always as identity not null,
  turno_id bigint not null,
  monto numeric(12, 2) not null,
  moneda text not null default 'ARS'::text,
  metodo text not null default 'efectivo'::text,
  estado text not null default 'pendiente'::text,
  notas text null,
  registrado_en timestamp with time zone not null default now(),
  actualizado_en timestamp with time zone not null default now(),
  nino_id bigint null,
  constraint pagos_pkey primary key (id),
  constraint pagos_nino_id_fkey foreign KEY (nino_id) references ninos (id_nino),
  constraint pagos_turno_id_fkey foreign KEY (turno_id) references turnos (id) on delete CASCADE
) TABLESPACE pg_default;
create table public.personas (
  id bigint generated by default as identity not null,
  nombre text not null,
  apellido text not null,
  telefono text null,
  email text null,
  fecha_nacimiento date null,
  foto_perfil text null,
  created_at timestamp with time zone not null default now(),
  constraint personas_pkey primary key (id),
  constraint personas_email_key unique (email)
) TABLESPACE pg_default;
create table public.profesional_departamentos (
  profesional_id bigint not null,
  departamento_id bigint not null,
  constraint profesional_departamentos_pkey primary key (profesional_id, departamento_id),
  constraint profesional_departamentos_departamento_id_fkey foreign KEY (departamento_id) references profesiones (id_departamento)
) TABLESPACE pg_default;
create table public.profesiones (
  id_departamento bigint generated always as identity not null,
  nombre character varying not null,
  duracion_default_min integer not null default 30,
  descripcion text null,
  responsable_id bigint null,
  constraint profesiones_pkey primary key (id_departamento),
  constraint profesiones_nombre_key unique (nombre)
) TABLESPACE pg_default;
create table public.responsables (
  id_responsable bigint generated always as identity not null,
  nombre text not null,
  apellido text not null,
  telefono text null,
  email text null,
  creado_en timestamp with time zone not null default now(),
  dni bigint null,
  activo boolean not null default true,
  constraint responsables_pkey primary key (id_responsable)
) TABLESPACE pg_default;
create table public.roles (
  id_rol bigint generated always as identity not null,
  nombre_rol character varying not null,
  creado_en timestamp with time zone not null default now(),
  constraint roles_pkey primary key (id_rol),
  constraint roles_nombre_rol_key unique (nombre_rol)
) TABLESPACE pg_default;
create table public.turno_profesionales (
  turno_id bigint not null,
  profesional_id bigint not null,
  rol_en_turno character varying not null default 'responsable'::character varying,
  constraint turno_profesionales_pkey primary key (profesional_id, turno_id),
  constraint turno_profesionales_turno_id_fkey foreign KEY (turno_id) references turnos (id)
) TABLESPACE pg_default;
create table public.turnos (
  id bigint generated always as identity not null,
  departamento_id bigint not null,
  inicio timestamp with time zone not null,
  fin timestamp with time zone not null,
  duracion_min integer not null,
  consultorio_id bigint null,
  estado text not null default 'pendiente'::text,
  creado_por bigint null,
  creado_en timestamp with time zone not null default now(),
  actualizado_en timestamp with time zone not null default now(),
  notas text null,
  nino_id bigint null,
  "Citacion" public.Citacion not null default 'Turno'::"Citacion",
  constraint turnos_pkey primary key (id),
  constraint turnos_consultorio_id_fkey foreign KEY (consultorio_id) references consultorios (id),
  constraint turnos_creado_por_fkey foreign KEY (creado_por) references usuarios (id_usuario),
  constraint turnos_departamento_id_fkey foreign KEY (departamento_id) references profesiones (id_departamento),
  constraint turnos_nino_id_fkey foreign KEY (nino_id) references ninos (id_nino)
) TABLESPACE pg_default;
create table public.usuario_roles (
  usuario_id bigint not null,
  rol_id bigint not null,
  asignado_en timestamp with time zone not null default now(),
  constraint usuario_roles_v2_pkey primary key (usuario_id, rol_id),
  constraint usuario_roles_v2_rol_id_fkey foreign KEY (rol_id) references roles (id_rol) on delete RESTRICT,
  constraint usuario_roles_v2_usuario_id_fkey foreign KEY (usuario_id) references usuarios (id_usuario) on delete CASCADE
) TABLESPACE pg_default;
create table public.usuarios (
  id_usuario bigint generated always as identity not null,
  dni bigint null,
  password_hash character varying null default '$2b$12$05HVDAICCjoJgLElA1JfSer6zSiRMNEdennz7NIVbqsgCqtaLIGey'::character varying,
  activo boolean not null default true,
  creado_en timestamp with time zone not null default now(),
  actualizado_en timestamp with time zone not null default now(),
  primer_registro_completado boolean not null default true,
  persona_id bigint null,
  constraint usuarios_pkey primary key (id_usuario),
  constraint usuarios_dni_key unique (dni),
  constraint usuarios_persona_id_key unique (persona_id),
  constraint usuarios_persona_id_fkey foreign KEY (persona_id) references personas (id) on delete CASCADE
) TABLESPACE pg_default;

