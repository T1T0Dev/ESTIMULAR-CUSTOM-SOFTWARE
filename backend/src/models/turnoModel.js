const supabase = require('../config/db');
const { formatNinoDetails } = require('../utils/ninoFormatter');

function buildDayRange(dateString) {
  const start = new Date(`${dateString}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function formatProfesionales(profesionales = []) {
  const ids = [];
  const nombres = [];
  const detalle = [];

  profesionales.forEach((item) => {
    const profesional = item?.profesional;
    if (!profesional) return;

    const idProfesional = profesional.id_profesional;
    if (idProfesional) {
      ids.push(String(idProfesional));
    }

    const nombre = [profesional.nombre, profesional.apellido]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (nombre) {
      nombres.push(nombre);
    }

    detalle.push({
      id_profesional: idProfesional || null,
      nombre: profesional.nombre || null,
      apellido: profesional.apellido || null,
      rol_en_turno: item?.rol_en_turno || 'responsable',
    });
  });

  return {
    ids: ids.join(','),
    nombres: nombres.join(', '),
    detalle,
  };
}

// formatNinoDetails imported from utils

async function getTurnosByDate(date) {
  const { start, end } = buildDayRange(date);

  const { data, error } = await supabase
    .from('turnos')
    .select(`
      id,
      inicio,
      fin,
      estado,
      notas,
      duracion_min,
      nino:ninos!turnos_nino_id_fkey (
        id_nino,
        nombre,
        apellido,
        fecha_nacimiento,
        dni,
        certificado_discapacidad,
        tipo,
        activo,
        foto_perfil,
        id_obra_social,
        obra_social:obras_sociales!ninos_id_obra_social_fkey (
          id_obra_social,
          nombre_obra_social,
          estado
        ),
        responsables:nino_responsables (
          parentesco,
          es_principal,
          responsable:responsables!nino_responsables_id_responsable_fkey (
            id_responsable,
            nombre,
            apellido,
            telefono,
            email
          )
        )
      ),
      consultorio:consultorios!turnos_consultorio_id_fkey (
        id,
        nombre,
        ubicacion
      ),
      departamento:profesiones!turnos_departamento_id_fkey (
        id_departamento,
        nombre
      ),
      profesionales:turno_profesionales (
        rol_en_turno,
        profesional:profesionales!turno_profesionales_profesional_id_fkey (
          id_profesional,
          nombre,
          apellido
        )
      )
    `)
    .gte('inicio', start)
    .lt('inicio', end)
    .order('inicio', { ascending: true });

  if (error) throw error;

  return data.map((turno) => {
    const { ids, nombres, detalle } = formatProfesionales(turno.profesionales);
    const consultorio = turno.consultorio || {};
    const departamento = turno.departamento || {};
    const paciente = formatNinoDetails(turno.nino);

    return {
      id: turno.id,
      inicio: turno.inicio,
      fin: turno.fin,
      estado: turno.estado,
      notas: turno.notas,
      duracion_min: turno.duracion_min,
      ...paciente,
      profesional_ids: ids,
      profesional_nombres: nombres,
      profesionales_detalle: detalle,
      consultorio_id: consultorio.id || null,
      consultorio_nombre: consultorio.nombre || null,
      consultorio_ubicacion: consultorio.ubicacion || null,
      servicio_id: departamento.id_departamento || null,
      servicio_nombre: departamento.nombre || null,
    };
  });
}

async function updateTurno(turnoId, dataToUpdate) {
  if (Object.keys(dataToUpdate).length === 0) {
    throw new Error('No fields to update');
  }

  const payload = {
    ...dataToUpdate,
    actualizado_en: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('turnos')
    .update(payload)
    .eq('id', turnoId)
    .select('id');

  if (error) throw error;

  return { affectedRows: Array.isArray(data) ? data.length : 0 };
}

async function getTurnoById(turnoId) {
  const { data, error } = await supabase
    .from('turnos')
    .select(`
      *,
      nino:ninos!turnos_nino_id_fkey (
        id_nino,
        nombre,
        apellido,
        dni,
        fecha_nacimiento,
        certificado_discapacidad,
        tipo,
        activo,
        foto_perfil,
        id_obra_social,
        obra_social:obras_sociales!ninos_id_obra_social_fkey (
          id_obra_social,
          nombre_obra_social,
          estado
        ),
        responsables:nino_responsables (
          parentesco,
          es_principal,
          responsable:responsables!nino_responsables_id_responsable_fkey (
            id_responsable,
            nombre,
            apellido,
            telefono,
            email
          )
        )
      ),
      profesionales:turno_profesionales (
        profesional_id,
        rol_en_turno,
        profesional:profesionales!turno_profesionales_profesional_id_fkey (
          id_profesional,
          nombre,
          apellido
        )
      )
    `)
    .eq('id', turnoId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  if (!data) return null;

  const { ids, nombres, detalle } = formatProfesionales(data.profesionales);
  const paciente = formatNinoDetails(data.nino);

  return {
    ...data,
    ...paciente,
    profesional_ids: ids,
    profesional_nombres: nombres,
    profesionales_detalle: detalle,
  };
}

async function getTurnoFormData() {
  const [departamentosResult, consultoriosResult, profesionalesResult] = await Promise.all([
    supabase
      .from('profesiones')
      .select('id_departamento, nombre, duracion_default_min, descripcion, responsable_id')
      .order('nombre', { ascending: true }),
    supabase
      .from('consultorios')
      .select('id, nombre, ubicacion')
      .order('nombre', { ascending: true }),
    supabase
      .from('profesionales')
      .select('id_profesional, nombre, apellido, telefono, email, id_departamento')
      .order('nombre', { ascending: true }),
  ]);

  if (departamentosResult.error) throw departamentosResult.error;
  if (consultoriosResult.error) throw consultoriosResult.error;
  if (profesionalesResult.error) throw profesionalesResult.error;

  const profesionales = (profesionalesResult.data || []).map((prof) => ({
    ...prof,
    nombre_completo: [prof.nombre, prof.apellido].filter(Boolean).join(' ').trim(),
  }));

  return {
    departamentos: departamentosResult.data || [],
    consultorios: consultoriosResult.data || [],
    profesionales,
  };
}

async function createTurno({
  departamento_id,
  inicio,
  duracion_min = 30,
  consultorio_id = null,
  notas = null,
  nino_id,
  creado_por = null,
  estado = 'pendiente',
  profesional_ids = [],
  precio = null,
  moneda = 'ARS',
  metodo_pago = 'efectivo',
}) {
  if (!departamento_id || !inicio || !nino_id) {
    throw new Error('Los campos departamento_id, inicio y nino_id son obligatorios.');
  }

  const start = new Date(inicio);
  if (Number.isNaN(start.getTime())) {
    throw new Error('La fecha de inicio del turno es inválida.');
  }

  const duration = Math.max(parseInt(duracion_min, 10) || 30, 5);
  const end = new Date(start.getTime() + duration * 60000);

  let turnoId = null;

  try {
    const { data: turnoInserted, error: turnoError } = await supabase
      .from('turnos')
      .insert({
        departamento_id,
        inicio: start.toISOString(),
        fin: end.toISOString(),
        duracion_min: duration,
        consultorio_id,
        notas: notas || null,
        creado_por,
        nino_id,
        estado,
      })
      .select('id')
      .single();

    if (turnoError) throw turnoError;

    turnoId = turnoInserted.id;

    const uniqueProfesionales = Array.from(
      new Set(
        (Array.isArray(profesional_ids) ? profesional_ids : [])
          .map((id) => parseInt(id, 10))
          .filter((id) => !Number.isNaN(id))
      )
    );

    if (uniqueProfesionales.length > 0) {
      const { error: profesionalesError } = await supabase
        .from('turno_profesionales')
        .insert(
          uniqueProfesionales.map((profId) => ({
            turno_id: turnoId,
            profesional_id: profId,
            rol_en_turno: 'responsable',
          }))
        );

      if (profesionalesError) throw profesionalesError;
    }

    const montoNumerico = precio === null || precio === undefined ? null : Number(precio);

    if (montoNumerico !== null && !Number.isNaN(montoNumerico) && montoNumerico > 0) {
      const { error: pagoError } = await supabase
        .from('pagos')
        .insert({
          turno_id: turnoId,
          monto: montoNumerico,
          moneda: moneda || 'ARS',
          metodo: metodo_pago || 'efectivo',
          estado: 'pendiente',
          nino_id,
        });

      if (pagoError) {
        throw pagoError;
      }
    }

    return await getTurnoById(turnoId);
  } catch (error) {
    if (turnoId) {
      await supabase.from('pagos').delete().eq('turno_id', turnoId);
      await supabase.from('turno_profesionales').delete().eq('turno_id', turnoId);
      await supabase.from('turnos').delete().eq('id', turnoId);
    }
    throw error;
  }
}

module.exports = {
  getTurnosByDate,
  updateTurno,
  getTurnoById,
  createTurno,
  getTurnoFormData,
};