const { supabaseAdmin } = require('../config/db');

const EXCLUDED_DEPARTMENT_STATES = new Set(['finalizado', 'finalizada', 'cerrado', 'cerrada', 'cancelado', 'cancelada', 'baja']);
const ACTIVE_TURNO_STATES = new Set(['pendiente', 'confirmado']);
const IGNORE_TURNO_STATES = new Set(['cancelado', 'cancelada']);

const DEFAULT_SLOT_MINUTES = 30;
const DEFAULT_DAY_START_HOUR = 9;
const DEFAULT_DAY_END_HOUR = 18;
const MAX_WEEKS_LOOKAHEAD = 12;

function parseId(value) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return null;
  return parsed;
}

function isValidDate(date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

function addMinutes(date, minutes) {
  const result = new Date(date.getTime());
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

function computeNextMonday(baseDate = new Date()) {
  const base = isValidDate(baseDate) ? new Date(baseDate.getTime()) : new Date();
  base.setHours(0, 0, 0, 0);

  while (base.getDay() !== 1) {
    base.setDate(base.getDate() + 1);
  }

  if (base.getTime() <= Date.now()) {
    base.setDate(base.getDate() + 7);
  }

  return base;
}

function dateRangesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function uniqueNumericIds(values = []) {
  return Array.from(
    new Set(
      (values || [])
        .map((value) => parseId(value))
        .filter((value) => value !== null),
    ),
  );
}

async function fetchConsultorioIds() {
  const { data, error } = await supabaseAdmin
    .from('consultorios')
    .select('id')
    .order('id', { ascending: true });

  if (error) throw error;

  return (data || [])
    .map((row) => parseId(row?.id))
    .filter((id) => id !== null)
    .sort((a, b) => a - b);
}

async function fetchFirstProfesionalesPorDepartamento(departamentoIds) {
  const uniqueIds = uniqueNumericIds(departamentoIds);
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabaseAdmin
    .from('profesional_departamentos')
    .select('profesional_id, departamento_id')
    .in('departamento_id', uniqueIds);

  if (error) throw error;

  const map = new Map();

  (data || []).forEach((row) => {
    const departamentoId = parseId(row?.departamento_id);
    const profesionalId = parseId(row?.profesional_id);
    if (!departamentoId || !profesionalId) return;

    if (!map.has(departamentoId) || profesionalId < map.get(departamentoId)) {
      map.set(departamentoId, profesionalId);
    }
  });

  return map;
}

async function fetchProfesionalesDisponiblesPorDepartamento(departamentoIds) {
  const uniqueDepartmentIds = uniqueNumericIds(departamentoIds);
  if (uniqueDepartmentIds.length === 0) {
    return new Map();
  }

  const { data: relaciones, error: relacionesError } = await supabaseAdmin
    .from('profesional_departamentos')
    .select('profesional_id, departamento_id')
    .in('departamento_id', uniqueDepartmentIds);

  if (relacionesError) throw relacionesError;

  const departamentoProfesionales = new Map();
  const profesionalIdsSet = new Set();

  (relaciones || []).forEach((row) => {
    const departamentoId = parseId(row?.departamento_id);
    const profesionalId = parseId(row?.profesional_id);
    if (!departamentoId || !profesionalId) return;
    if (!departamentoProfesionales.has(departamentoId)) {
      departamentoProfesionales.set(departamentoId, new Set());
    }
    departamentoProfesionales.get(departamentoId).add(profesionalId);
    profesionalIdsSet.add(profesionalId);
  });

  if (profesionalIdsSet.size === 0) {
    return new Map();
  }

  const profesionalIds = Array.from(profesionalIdsSet.values());

  const { data: usuariosData, error: usuariosError } = await supabaseAdmin
    .from('usuarios')
    .select('id_usuario, persona_id')
    .in('id_usuario', profesionalIds);

  if (usuariosError) throw usuariosError;

  const usuarioPersonaMap = new Map();
  const personaIdsSet = new Set();

  (usuariosData || []).forEach((row) => {
    const usuarioId = parseId(row?.id_usuario);
    const personaId = parseId(row?.persona_id);
    if (!usuarioId) return;
    if (personaId) personaIdsSet.add(personaId);
    usuarioPersonaMap.set(usuarioId, personaId || null);
  });

  let personasData = [];
  if (personaIdsSet.size > 0) {
    const { data, error } = await supabaseAdmin
      .from('personas')
      .select('id, nombre, apellido')
      .in('id', Array.from(personaIdsSet.values()));
    if (error) throw error;
    personasData = data || [];
  }

  const personaMap = new Map();
  (personasData || []).forEach((row) => {
    const personaId = parseId(row?.id);
    if (!personaId) return;
    personaMap.set(personaId, {
      nombre: row?.nombre || null,
      apellido: row?.apellido || null,
    });
  });

  const { data: rolesData, error: rolesError } = await supabaseAdmin
    .from('usuario_roles')
    .select('usuario_id, rol:roles ( nombre_rol )')
    .in('usuario_id', profesionalIds);

  if (rolesError) throw rolesError;

  const rolesPorUsuario = new Map();
  (rolesData || []).forEach((row) => {
    const usuarioId = parseId(row?.usuario_id);
    if (!usuarioId) return;
    const lista = rolesPorUsuario.get(usuarioId) || [];
    const rolNombre = row?.rol?.nombre_rol || null;
    if (rolNombre) {
      lista.push(rolNombre);
    }
    rolesPorUsuario.set(usuarioId, lista);
  });

  const collator = new Intl.Collator('es', { sensitivity: 'base', ignorePunctuation: true });
  const result = new Map();

  departamentoProfesionales.forEach((profIdsSet, deptId) => {
    const list = Array.from(profIdsSet.values()).map((profId) => {
      const personaId = usuarioPersonaMap.get(profId) || null;
      const persona = personaId ? personaMap.get(personaId) : null;
      const roles = rolesPorUsuario.get(profId) || [];
      const nombre = persona?.nombre || null;
      const apellido = persona?.apellido || null;
      const nombreCompleto = [nombre, apellido].filter(Boolean).join(' ').trim() || `Profesional ${profId}`;

      return {
        id_profesional: profId,
        nombre,
        apellido,
        nombre_completo: nombreCompleto,
        roles,
        es_admin: roles.some((rol) => typeof rol === 'string' && rol.toLowerCase().includes('admin')),
      };
    });

    list.sort((a, b) => collator.compare(a.nombre_completo || '', b.nombre_completo || ''));
    result.set(deptId, list);
  });

  return result;
}

async function findAvailableSlotForDay(baseDay, requiredMinutes, consultorioIds, preferredConsultorioId = null) {
  const dayStart = new Date(baseDay.getTime());
  dayStart.setHours(DEFAULT_DAY_START_HOUR, 0, 0, 0);

  const dayEnd = new Date(baseDay.getTime());
  dayEnd.setHours(DEFAULT_DAY_END_HOUR, 0, 0, 0);

  const nextDay = new Date(baseDay.getTime());
  nextDay.setDate(nextDay.getDate() + 1);

  const { data: turnos, error } = await supabaseAdmin
    .from('turnos')
    .select('inicio, fin, consultorio_id, estado')
    .gte('inicio', dayStart.toISOString())
    .lt('inicio', nextDay.toISOString())
    .order('inicio', { ascending: true });

  if (error) throw error;

  const ocupacionPorConsultorio = new Map();

  (turnos || []).forEach((turno) => {
    const consultorioId = parseId(turno?.consultorio_id);
    const estado = String(turno?.estado || '').toLowerCase();
    if (!consultorioId || IGNORE_TURNO_STATES.has(estado)) {
      return;
    }

    const inicio = new Date(turno.inicio);
    const fin = new Date(turno.fin);
    if (!isValidDate(inicio) || !isValidDate(fin)) {
      return;
    }

    if (!ocupacionPorConsultorio.has(consultorioId)) {
      ocupacionPorConsultorio.set(consultorioId, []);
    }

    ocupacionPorConsultorio.get(consultorioId).push({ inicio, fin });
  });

  ocupacionPorConsultorio.forEach((bloques) => {
    bloques.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  });

  const preferredId = parseId(preferredConsultorioId);
  const consultorioOrder = preferredId && consultorioIds.includes(preferredId)
    ? [preferredId, ...consultorioIds.filter((id) => id !== preferredId)]
    : [...consultorioIds];

  for (let cursor = new Date(dayStart); cursor < dayEnd; cursor = addMinutes(cursor, DEFAULT_SLOT_MINUTES)) {
    const candidateEnd = addMinutes(cursor, requiredMinutes);
    if (candidateEnd > dayEnd) {
      break;
    }

    const disponibleConsultorio = consultorioOrder.find((consultorioId) => {
      const bloques = ocupacionPorConsultorio.get(consultorioId) || [];
      return !bloques.some(({ inicio, fin }) => dateRangesOverlap(cursor, candidateEnd, inicio, fin));
    });

    if (disponibleConsultorio) {
      return {
        inicio: new Date(cursor.getTime()),
        fin: candidateEnd,
        consultorioId: disponibleConsultorio,
      };
    }
  }

  return null;
}

async function findFirstAvailableSlot({ referenceDate, requiredMinutes, preferredConsultorioId = null }) {
  const duration = Math.max(Number(requiredMinutes) || DEFAULT_SLOT_MINUTES, DEFAULT_SLOT_MINUTES);
  const consultorioIds = await fetchConsultorioIds();

  if (!consultorioIds || consultorioIds.length === 0) {
    return null;
  }

  let attempts = 0;
  let currentDay = computeNextMonday(referenceDate);

  while (attempts < MAX_WEEKS_LOOKAHEAD) {
    const slot = await findAvailableSlotForDay(currentDay, duration, consultorioIds, preferredConsultorioId);
    if (slot) {
      return slot;
    }

    currentDay.setDate(currentDay.getDate() + 7);
    attempts += 1;
  }

  return null;
}

async function fetchRequiredDepartments(ninoId) {
  const { data, error } = await supabaseAdmin
    .from('nino_departamentos')
    .select(
      `id, estado, departamento_id, profesional_asignado_id,
       departamento:profesiones ( id_departamento, nombre, duracion_default_min, responsable_id )`
    )
    .eq('nino_id', ninoId);

  if (error) throw error;

  const needsByDepartment = new Map();

  (data || []).forEach((row) => {
    const departamentoId = parseId(row?.departamento_id || row?.departamento?.id_departamento);
    if (!departamentoId) return;

    const estado = String(row?.estado || '').toLowerCase();
    if (estado && EXCLUDED_DEPARTMENT_STATES.has(estado)) return;

    const duracion = parseId(row?.departamento?.duracion_default_min) || 30;
    const profesionalAsignado = parseId(row?.profesional_asignado_id);
    const responsableDefault = parseId(row?.departamento?.responsable_id);

    if (!needsByDepartment.has(departamentoId)) {
      needsByDepartment.set(departamentoId, {
        departamentoId,
        departamentoNombre: row?.departamento?.nombre || null,
        duracion,
        profesionalAsignadoId: profesionalAsignado || null,
        responsableId: responsableDefault || null,
      });
    }
  });

  return Array.from(needsByDepartment.values());
}

async function fetchExistingActiveTurnos(ninoId) {
  const { data, error } = await supabaseAdmin
    .from('turnos')
    .select('id, departamento_id, inicio, estado')
    .eq('nino_id', ninoId)
    .gte('inicio', new Date().toISOString());

  if (error) throw error;

  const activeDepartments = new Set();

  (data || []).forEach((turno) => {
    const departamentoId = parseId(turno?.departamento_id);
    if (!departamentoId) return;
    const estado = String(turno?.estado || '').toLowerCase();
    if (ACTIVE_TURNO_STATES.has(estado)) {
      activeDepartments.add(departamentoId);
    }
  });

  return activeDepartments;
}

async function cancelAutoScheduledTurnosForNino(ninoId) {
  const parsedId = parseId(ninoId);
  if (!parsedId) return [];

  const nowIso = new Date().toISOString();

  const { data: turnos, error } = await supabaseAdmin
    .from('turnos')
    .select('id')
    .eq('nino_id', parsedId)
    .gte('inicio', nowIso)
    .like('notas', 'Creado automáticamente%');

  if (error) throw error;

  const ids = (turnos || [])
    .map((row) => parseId(row?.id))
    .filter((id) => id !== null);

  if (ids.length === 0) {
    return [];
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('turnos')
    .update({
      estado: 'cancelado',
      nino_id: null,
      actualizado_en: new Date().toISOString(),
    })
    .in('id', ids)
    .select('id');

  if (updateError) throw updateError;

  return Array.isArray(updated) ? updated : [];
}

async function generateTurnoSuggestionsForNino({
  ninoId,
  baseInicio,
  consultorioId = null,
}) {
  const parsedNinoId = parseId(ninoId);
  if (!parsedNinoId) {
    return { slot: null, propuestas: [], omitidos: [] };
  }

  const [needs, activeDepartments] = await Promise.all([
    fetchRequiredDepartments(parsedNinoId),
    fetchExistingActiveTurnos(parsedNinoId),
  ]);

  if (!needs || needs.length === 0) {
    return { slot: null, propuestas: [], omitidos: [] };
  }

  const pendientes = [];
  const omitidos = [];

  needs.forEach((need) => {
    if (activeDepartments.has(need.departamentoId)) {
      omitidos.push({
        motivo: 'ya_tiene_turno_activo',
        departamento_id: need.departamentoId,
      });
    } else {
      pendientes.push(need);
    }
  });

  if (pendientes.length === 0) {
    return { slot: null, propuestas: [], omitidos };
  }

  const maxDuration = pendientes.reduce(
    (acc, item) => Math.max(acc, parseInt(item.duracion, 10) || DEFAULT_SLOT_MINUTES),
    DEFAULT_SLOT_MINUTES,
  );

  const departamentoIds = pendientes.map((need) => need.departamentoId);
  const [fallbackProfesionales, profesionalesDisponibles] = await Promise.all([
    fetchFirstProfesionalesPorDepartamento(departamentoIds),
    fetchProfesionalesDisponiblesPorDepartamento(departamentoIds),
  ]);

  const candidateSlot = await findFirstAvailableSlot({
    referenceDate: baseInicio || new Date(),
    requiredMinutes: maxDuration,
    preferredConsultorioId: consultorioId ? parseId(consultorioId) : null,
  });

  if (!candidateSlot) {
    throw new Error('No se encontraron turnos disponibles en los próximos lunes.');
  }

  const assignedConsultorioId = parseId(candidateSlot.consultorioId) ?? (consultorioId ? parseId(consultorioId) : null);
  const shouldShareSlot = pendientes.length > 1;
  const sharedInicioIso = candidateSlot.inicio.toISOString();
  const sharedFinIso = candidateSlot.fin.toISOString();
  const sharedDuration = maxDuration;

  const propuestas = pendientes.map((need) => {
    const inicio = shouldShareSlot ? sharedInicioIso : new Date(candidateSlot.inicio.getTime()).toISOString();
    const fin = shouldShareSlot
      ? sharedFinIso
      : addMinutes(new Date(candidateSlot.inicio.getTime()), need.duracion).toISOString();

    const disponibles = (profesionalesDisponibles.get(need.departamentoId) || []).map((prof) => ({
      ...prof,
      es_responsable: need.responsableId ? prof.id_profesional === need.responsableId : false,
    }));

    const candidatoResponsable = disponibles.find((prof) => prof.es_responsable);
    const candidatoAdmin = disponibles.find((prof) => prof.es_admin);
    const fallbackProfesionalId = fallbackProfesionales.get(need.departamentoId) || null;

    const profesionalPreferido = need.profesionalAsignadoId
      || (candidatoResponsable ? candidatoResponsable.id_profesional : null)
      || (need.responsableId ? need.responsableId : null)
      || (candidatoAdmin ? candidatoAdmin.id_profesional : null)
      || fallbackProfesionalId
      || (disponibles.length > 0 ? disponibles[0].id_profesional : null);

    const profesionalIds = profesionalPreferido ? [profesionalPreferido] : [];
    const disponiblesMarcados = disponibles.map((prof) => ({
      ...prof,
      seleccionado_por_defecto: profesionalIds.includes(prof.id_profesional),
    }));
    const duracionMin = shouldShareSlot ? sharedDuration : need.duracion;

    return {
      departamento_id: need.departamentoId,
      departamento_nombre: need.departamentoNombre || null,
      inicio,
      fin,
      duracion_min: duracionMin,
      profesional_ids: profesionalIds,
      consultorio_id: assignedConsultorioId,
      estado: 'pendiente',
      notas: 'Entrevista',
      profesionales_disponibles: disponiblesMarcados,
    };
  });

  return {
    slot: {
      inicio: candidateSlot.inicio.toISOString(),
      fin: candidateSlot.fin.toISOString(),
      duracion_min: maxDuration,
      consultorio_id: assignedConsultorioId,
    },
    propuestas,
    omitidos,
  };
}

module.exports = {
  generateTurnoSuggestionsForNino,
  cancelAutoScheduledTurnosForNino,
};
