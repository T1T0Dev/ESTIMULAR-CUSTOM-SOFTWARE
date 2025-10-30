const supabase = require('../config/db');

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

function formatResponsables(responsables = []) {
  return responsables
    .map((relacion) => {
      const responsable = relacion?.responsable || {};
      const nombre = responsable.nombre ?? responsable.nombre_responsable ?? null;
      const apellido = responsable.apellido ?? responsable.apellido_responsable ?? null;

      return {
        id_responsable: responsable.id_responsable ?? null,
        nombre,
        apellido,
        telefono: responsable.telefono ?? null,
        email: responsable.email ?? null,
        parentesco: relacion?.parentesco ?? null,
        es_principal: relacion?.es_principal ?? false,
      };
    })
    .filter((item) => item.id_responsable || item.nombre || item.apellido);
}

function formatNinoDetails(nino) {
  if (!nino) {
    return {
      paciente_id: null,
      paciente_nombre: null,
      paciente_apellido: null,
      paciente_fecha_nacimiento: null,
      paciente_dni: null,
      paciente_certificado_discapacidad: null,
      paciente_tipo: null,
      paciente_activo: null,
      paciente_foto_perfil: null,
      paciente_obra_social_id: null,
      paciente_obra_social: null,
      paciente_cud: null,
      paciente_responsables: [],
      paciente_titular_id: null,
      paciente_titular_nombre: null,
      paciente_titular_parentesco: null,
      paciente_titular_es_principal: null,
      paciente_email: null,
      paciente_telefono: null,
      telefono: null,
      email: null,
      titular_nombre: null,
      obra_social: null,
      cud: null,
    };
  }

  const obraSocialNombre = nino.obra_social?.nombre ?? nino.obra_social?.nombre_obra_social ?? null;
  const responsables = formatResponsables(nino.responsables);
  const principal = responsables.find((rel) => rel.es_principal) || responsables[0] || null;
  const titularNombre = principal
    ? [principal.nombre, principal.apellido].filter(Boolean).join(' ').trim() || null
    : null;
  const cudLabel = nino.certificado_discapacidad ? 'Sí' : 'No posee';

  return {
    paciente_id: nino.id_nino ?? null,
    paciente_nombre: nino.nombre ?? null,
    paciente_apellido: nino.apellido ?? null,
    paciente_fecha_nacimiento: nino.fecha_nacimiento ?? null,
    paciente_dni: nino.dni ?? null,
    paciente_certificado_discapacidad: Boolean(nino.certificado_discapacidad),
    paciente_tipo: nino.tipo ?? null,
    paciente_activo: nino.activo ?? null,
    paciente_foto_perfil: nino.foto_perfil ?? null,
    paciente_obra_social_id: nino.obra_social?.id_obra_social ?? nino.id_obra_social ?? null,
    paciente_obra_social: obraSocialNombre,
    paciente_cud: cudLabel,
    paciente_responsables: responsables,
    paciente_titular_id: principal?.id_responsable ?? null,
    paciente_titular_nombre: titularNombre,
    paciente_titular_parentesco: principal?.parentesco ?? null,
    paciente_titular_es_principal: principal?.es_principal ?? null,
    paciente_email: principal?.email ?? null,
    paciente_telefono: principal?.telefono ?? null,
    telefono: principal?.telefono ?? null,
    email: principal?.email ?? null,
    titular_nombre: titularNombre,
    obra_social: obraSocialNombre,
    cud: cudLabel,
  };
}

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

module.exports = {
  getTurnosByDate,
  updateTurno,
  getTurnoById,
};