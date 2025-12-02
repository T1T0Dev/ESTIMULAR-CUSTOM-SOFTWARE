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

function normalizeProfessionalId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function clampDiscount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return 0;
  if (parsed < 0) return 0;
  if (parsed > 1) return 1;
  return parsed;
}

function extractFirstNumber(value) {
  if (value === null || value === undefined) return null;
  const match = String(value).match(/\d+/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) && !Number.isNaN(parsed) ? parsed : null;
}

function compareConsultoriosNatural(a, b) {
  const nombreA = (a?.nombre || '').trim();
  const nombreB = (b?.nombre || '').trim();
  const numA = extractFirstNumber(nombreA);
  const numB = extractFirstNumber(nombreB);

  if (numA !== null && numB !== null && numA !== numB) {
    return numA - numB;
  }
  if (numA !== null && numB === null) return -1;
  if (numA === null && numB !== null) return 1;

  return nombreA.localeCompare(nombreB, 'es', { numeric: true, sensitivity: 'base' });
}

async function fetchObraSocialDescuentoByNinoId(ninoId) {
  if (!ninoId) return 0;
  try {
    const { data, error } = await supabase
      .from('ninos')
      .select(`
        id_obra_social,
        obra_social:obras_sociales!ninos_id_obra_social_fkey ( descuento )
      `)
      .eq('id_nino', ninoId)
      .maybeSingle();

    if (error) {
      console.error('fetchObraSocialDescuentoByNinoId error:', error);
      return 0;
    }

    const raw = data?.obra_social?.descuento;
    return clampDiscount(raw);
  } catch (err) {
    console.error('fetchObraSocialDescuentoByNinoId exception:', err);
    return 0;
  }
}

async function fetchProfesionalesDetailsByUsuarioIds(usuarioIds = []) {
  const uniqueIds = Array.from(
    new Set(
      (usuarioIds || [])
        .map((value) => normalizeProfessionalId(value))
        .filter((id) => id !== null)
    )
  );

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data: usuariosData, error: usuariosError } = await supabase
    .from('usuarios')
    .select('id_usuario, persona_id, activo')
    .in('id_usuario', uniqueIds);
  if (usuariosError) throw usuariosError;

  const personaIdSet = new Set();
  usuariosData.forEach((row) => {
    const personaId = normalizeProfessionalId(row?.persona_id);
    if (personaId) {
      personaIdSet.add(personaId);
    }
  });

  const personaIds = Array.from(personaIdSet);

  let personasData = [];
  if (personaIds.length > 0) {
    const { data, error } = await supabase
      .from('personas')
      .select('id, nombre, apellido, telefono, email')
      .in('id', personaIds);
    if (error) throw error;
    personasData = data || [];
  }

  const personaMap = new Map();
  personasData.forEach((row) => {
    personaMap.set(row.id, row);
  });

  let profesionalDepartamentos = [];
  if (personaIds.length > 0) {
    const { data, error } = await supabase
      .from('profesional_departamentos')
      .select('profesional_id, departamento_id')
      .in('profesional_id', personaIds);
    if (error) throw error;
    profesionalDepartamentos = data || [];
  }

  const departamentoIdSet = new Set();
  profesionalDepartamentos.forEach((row) => {
    const depId = normalizeProfessionalId(row?.departamento_id);
    if (depId) departamentoIdSet.add(depId);
  });

  const departamentoIds = Array.from(departamentoIdSet);

  let departamentosData = [];
  if (departamentoIds.length > 0) {
    const { data, error } = await supabase
      .from('profesiones')
      .select('id_departamento, nombre')
      .in('id_departamento', departamentoIds);
    if (error) throw error;
    departamentosData = data || [];
  }

  const departamentoMap = new Map();
  departamentosData.forEach((row) => {
    departamentoMap.set(row.id_departamento, row);
  });

  const { data: rolesLinksData, error: rolesLinksError } = await supabase
    .from('usuario_roles')
    .select('usuario_id, rol_id')
    .in('usuario_id', uniqueIds);
  if (rolesLinksError) throw rolesLinksError;

  const roleIdSet = new Set();
  (rolesLinksData || []).forEach((row) => {
    const rolId = normalizeProfessionalId(row?.rol_id);
    if (rolId) roleIdSet.add(rolId);
  });

  const roleIds = Array.from(roleIdSet);

  let rolesCatalogData = [];
  if (roleIds.length > 0) {
    const { data, error } = await supabase
      .from('roles')
      .select('id_rol, nombre_rol')
      .in('id_rol', roleIds);
    if (error) throw error;
    rolesCatalogData = data || [];
  }

  const roleIdToName = new Map();
  rolesCatalogData.forEach((row) => {
    roleIdToName.set(row.id_rol, row.nombre_rol || null);
  });

  const userRolesMap = new Map();
  (rolesLinksData || []).forEach((row) => {
    const userId = normalizeProfessionalId(row?.usuario_id);
    const rolId = normalizeProfessionalId(row?.rol_id);
    if (!userId || !rolId) return;
    const current = userRolesMap.get(userId) || [];
    const rolNombre = roleIdToName.get(rolId) || null;
    if (rolNombre) {
      current.push(rolNombre);
    }
    userRolesMap.set(userId, current);
  });

  const departamentoByPersona = new Map();
  profesionalDepartamentos.forEach((row) => {
    const personaId = normalizeProfessionalId(row?.profesional_id);
    if (!personaId) return;
    const depId = normalizeProfessionalId(row?.departamento_id);
    if (!departamentoByPersona.has(personaId)) {
      departamentoByPersona.set(personaId, []);
    }
    if (depId) {
      const list = departamentoByPersona.get(personaId);
      if (!list.includes(depId)) {
        list.push(depId);
      }
    }
  });

  const resultMap = new Map();

  usuariosData.forEach((row) => {
    const usuarioId = normalizeProfessionalId(row?.id_usuario);
    if (!usuarioId) return;
    const personaId = normalizeProfessionalId(row?.persona_id);
    const persona = personaId ? personaMap.get(personaId) : null;

    const depIds = personaId ? departamentoByPersona.get(personaId) || [] : [];
    const primaryDepId = depIds.length > 0 ? depIds[0] : null;
    const departamento = primaryDepId ? departamentoMap.get(primaryDepId) : null;

    resultMap.set(usuarioId, {
      id_profesional: usuarioId,
      usuario_id: usuarioId,
      persona_id: personaId || null,
      nombre: persona?.nombre || null,
      apellido: persona?.apellido || null,
      telefono: persona?.telefono || null,
      email: persona?.email || null,
      id_departamento: primaryDepId,
      departamento_nombre: departamento?.nombre || null,
      roles: userRolesMap.get(usuarioId) || [],
      activo: row?.activo,
      departamento_ids: depIds,
    });
  });

  return resultMap;
}

function formatProfesionales(profesionales = [], profesionalesDetailsMap = new Map()) {
  const uniqueIds = new Set();
  const nombres = [];
  const detalle = [];

  profesionales.forEach((item) => {
    if (!item) return;

    const rawId =
      item?.profesional_id ??
      item?.professional_id ??
      item?.usuario_id ??
      item?.id_profesional ??
      null;
    const profesionalId = normalizeProfessionalId(rawId);
    const info = profesionalId ? profesionalesDetailsMap.get(profesionalId) : null;

    if (profesionalId) {
      uniqueIds.add(String(profesionalId));
    }

    const nombreCompleto = info
      ? [info.nombre, info.apellido].filter(Boolean).join(' ').trim()
      : null;

    if (nombreCompleto) {
      nombres.push(nombreCompleto);
    }

    detalle.push({
      id_profesional: profesionalId || null,
      usuario_id: profesionalId || null,
      persona_id: info?.persona_id ?? null,
      nombre: info?.nombre ?? null,
      apellido: info?.apellido ?? null,
      telefono: info?.telefono ?? null,
      email: info?.email ?? null,
      departamento_id: info?.id_departamento ?? null,
      departamento_nombre: info?.departamento_nombre ?? null,
      roles: info?.roles ?? [],
      rol_en_turno: item?.rol_en_turno || 'responsable',
    });
  });

  return {
    ids: Array.from(uniqueIds).join(','),
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
          estado,
          descuento
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
        profesional_id,
        rol_en_turno
      )
    `)
    .gte('inicio', start)
    .lt('inicio', end)
    .order('inicio', { ascending: true });

  if (error) throw error;

  const profesionalesNecesarios = new Set();
  (data || []).forEach((turno) => {
    (turno?.profesionales || []).forEach((item) => {
      const profesionalId = normalizeProfessionalId(item?.profesional_id);
      if (profesionalId) profesionalesNecesarios.add(profesionalId);
    });
  });

  let profesionalesDetails = new Map();
  if (profesionalesNecesarios.size > 0) {
    profesionalesDetails = await fetchProfesionalesDetailsByUsuarioIds(Array.from(profesionalesNecesarios));
  }

  return data.map((turno) => {
    const { ids, nombres, detalle } = formatProfesionales(turno.profesionales, profesionalesDetails);
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

async function deleteTurno(turnoId) {
  const parsedId = normalizeProfessionalId(turnoId);
  if (!parsedId) {
    throw new Error('ID de turno inválido');
  }

  await supabase
    .from('turno_profesionales')
    .delete()
    .eq('turno_id', parsedId);

  const { data, error } = await supabase
    .from('turnos')
    .delete()
    .eq('id', parsedId)
    .select('id')
    .maybeSingle();

  if (error) throw error;

  return data;
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
          estado,
          descuento
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
        rol_en_turno
      )
    `)
    .eq('id', turnoId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  if (!data) return null;

  let profesionalesDetails = new Map();
  const profesionalIds = new Set();
  (data.profesionales || []).forEach((item) => {
    const profesionalId = normalizeProfessionalId(item?.profesional_id);
    if (profesionalId) profesionalIds.add(profesionalId);
  });
  if (profesionalIds.size > 0) {
    profesionalesDetails = await fetchProfesionalesDetailsByUsuarioIds(Array.from(profesionalIds));
  }

  const { ids, nombres, detalle } = formatProfesionales(data.profesionales, profesionalesDetails);
  const paciente = formatNinoDetails(data.nino);

  const estadoTurno = data?.estado ?? null;

  return {
    ...data,
    estado: estadoTurno,
    ...paciente,
    profesional_ids: ids,
    profesional_nombres: nombres,
    profesionales_detalle: detalle,
  };
}

async function getTurnoFormData() {
  const [departamentosResult, consultoriosResult, rolesCatalogResult, profesionalDepartamentosResult] = await Promise.all([
    supabase
      .from('profesiones')
      .select('id_departamento, nombre, duracion_default_min, descripcion, responsable_id')
      .order('nombre', { ascending: true }),
    supabase
      .from('consultorios')
      .select('id, nombre, ubicacion')
      .order('nombre', { ascending: true }),
    supabase
      .from('roles')
      .select('id_rol, nombre_rol'),
    supabase
      .from('profesional_departamentos')
      .select('profesional_id, departamento_id'),
  ]);

  if (departamentosResult.error) throw departamentosResult.error;
  if (consultoriosResult.error) throw consultoriosResult.error;
  if (rolesCatalogResult.error) throw rolesCatalogResult.error;
  if (profesionalDepartamentosResult.error) throw profesionalDepartamentosResult.error;

  const consultoriosOrdenados = (consultoriosResult.data || [])
    .slice()
    .sort(compareConsultoriosNatural);

  const rolesCatalog = rolesCatalogResult.data || [];
  const profesionalRoleIds = rolesCatalog
    .filter((row) => typeof row?.nombre_rol === 'string' && row.nombre_rol.toLowerCase().includes('profesional'))
    .map((row) => row.id_rol)
    .map((id) => normalizeProfessionalId(id))
    .filter((id) => id !== null);

  let usuariosRolesData = [];
  if (profesionalRoleIds.length > 0) {
    const { data, error } = await supabase
      .from('usuario_roles')
      .select('usuario_id, rol_id')
      .in('rol_id', profesionalRoleIds);
    if (error) throw error;
    usuariosRolesData = data || [];
  }

  const usuarioIdsSet = new Set();
  usuariosRolesData.forEach((row) => {
    const userId = normalizeProfessionalId(row?.usuario_id);
    if (userId) usuarioIdsSet.add(userId);
  });

  const personaIdsFromDepartamentos = new Set();
  (profesionalDepartamentosResult.data || []).forEach((row) => {
    const personaId = normalizeProfessionalId(row?.profesional_id);
    if (personaId) personaIdsFromDepartamentos.add(personaId);
  });

  if (personaIdsFromDepartamentos.size > 0) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id_usuario, persona_id')
      .in('persona_id', Array.from(personaIdsFromDepartamentos));
    if (error) throw error;
    (data || []).forEach((row) => {
      const userId = normalizeProfessionalId(row?.id_usuario);
      if (userId) usuarioIdsSet.add(userId);
    });
  }

  const usuarioIds = Array.from(usuarioIdsSet);

  const profesionalesDetailsMap = usuarioIds.length > 0
    ? await fetchProfesionalesDetailsByUsuarioIds(usuarioIds)
    : new Map();

  const profesionales = Array.from(profesionalesDetailsMap.values())
    .filter((prof) => prof && prof.id_profesional && prof.activo !== false)
    .map((prof) => {
      const nombre = prof.nombre || '';
      const apellido = prof.apellido || '';
      const nombreCompleto = [nombre, apellido].filter(Boolean).join(' ').trim() || `Profesional ${prof.id_profesional}`;
      return {
        id_profesional: prof.id_profesional,
        usuario_id: prof.usuario_id,
        persona_id: prof.persona_id,
        nombre: nombre || null,
        apellido: apellido || null,
        telefono: prof.telefono || null,
        email: prof.email || null,
        id_departamento: prof.id_departamento || null,
        departamento_nombre: prof.departamento_nombre || null,
        roles: prof.roles || [],
        nombre_completo: nombreCompleto,
      };
    })
    .sort((a, b) => (a.nombre_completo || '').localeCompare(b.nombre_completo || '', 'es'));

  return {
    departamentos: departamentosResult.data || [],
    consultorios: consultoriosOrdenados,
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
    const estadoTurno = estado ?? 'pendiente';

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
        estado: estadoTurno,
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
      const montoOriginal = Number(montoNumerico.toFixed(2));
      let montoFinal = montoOriginal;
      let notas = null;

      if (nino_id) {
        const descuento = await fetchObraSocialDescuentoByNinoId(nino_id);
        if (descuento > 0) {
          montoFinal = Math.max(Number((montoOriginal * (1 - descuento)).toFixed(2)), 0);
          notas = JSON.stringify({
            monto_original: montoOriginal,
            descuento_aplicado: descuento,
          });
        }
      }

      const pagoPayload = {
        turno_id: turnoId,
        monto: montoFinal,
        moneda: 'ARS',
        metodo: 'por_definir',
        estado: 'pendiente',
        nino_id,
      };

      if (notas) {
        pagoPayload.notas = notas;
      }

      const { error: pagoError } = await supabase.from('pagos').insert(pagoPayload);

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
  deleteTurno,
};