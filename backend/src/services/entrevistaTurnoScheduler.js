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
        profesionalId: profesionalAsignado || responsableDefault || null,
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

  const candidateSlot = await findFirstAvailableSlot({
    referenceDate: baseInicio || new Date(),
    requiredMinutes: maxDuration,
    preferredConsultorioId: consultorioId ? parseId(consultorioId) : null,
  });

  if (!candidateSlot) {
    throw new Error('No se encontraron turnos disponibles en los próximos lunes.');
  }

  const assignedConsultorioId = parseId(candidateSlot.consultorioId) ?? (consultorioId ? parseId(consultorioId) : null);

  const propuestas = pendientes.map((need) => {
    const inicio = new Date(candidateSlot.inicio.getTime());
    const fin = addMinutes(inicio, need.duracion);

    return {
      departamento_id: need.departamentoId,
      departamento_nombre: need.departamentoNombre || null,
      inicio: inicio.toISOString(),
      fin: fin.toISOString(),
      duracion_min: need.duracion,
      profesional_ids: need.profesionalId ? [need.profesionalId] : [],
      consultorio_id: assignedConsultorioId,
      estado: 'pendiente',
      notas: 'Entrevista',
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
