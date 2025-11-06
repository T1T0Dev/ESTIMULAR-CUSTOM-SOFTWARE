const turnoModel = require('../models/turnoModel');
const notificacionModel = require('../models/notificacionModel');
const { supabaseAdmin } = require('../config/db');
const { generateTurnoSuggestionsForNino, cancelAutoScheduledTurnosForNino } = require('../services/entrevistaTurnoScheduler');

function parseNumericId(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return null;
  return parsed;
}

function isAdminRoleName(value) {
  if (!value) return false;
  const normalized = String(value).toLowerCase();
  return normalized.includes('admin');
}

async function userIsAdmin(userId) {
  if (!userId) return false;
  try {
    const { data, error } = await supabaseAdmin
      .from('usuario_roles')
      .select('rol:roles ( id_rol, nombre_rol )')
      .eq('usuario_id', Number(userId));

    if (error) {
      console.error('userIsAdmin roles error:', error);
      return false;
    }

    return (data || [])
      .map((row) => row?.rol?.nombre_rol)
      .filter(Boolean)
      .some((name) => isAdminRoleName(name));
  } catch (err) {
    console.error('userIsAdmin exception:', err);
    return false;
  }
}

/**
 * Maneja la solicitud para obtener los turnos de una fecha específica.
 */
async function handleGetTurnos(req, res) {
  const { date, estado, nino_id, disponible, desde, hasta, limit = 50 } = req.query || {};

  if (!date) {
    try {
      let query = supabaseAdmin
        .from('turnos')
        .select('id, departamento_id, inicio, fin, duracion_min, consultorio_id, estado, nino_id', { count: 'exact' })
        .order('inicio', { ascending: true })
        .limit(Number(limit) || 50);

      if (estado) query = query.eq('estado', estado);
      if (nino_id) query = query.eq('nino_id', Number(nino_id));

      if (String(disponible) === 'true') {
        query = query.is('nino_id', null);
        if (!estado) query = query.eq('estado', 'pendiente');
      }

      if (desde) {
        const fromDate = new Date(desde);
        if (!Number.isNaN(fromDate.getTime())) {
          query = query.gte('inicio', fromDate.toISOString());
        }
      }

      if (hasta) {
        const toDate = new Date(hasta);
        if (!Number.isNaN(toDate.getTime())) {
          query = query.lte('inicio', toDate.toISOString());
        }
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return res.json({
        success: true,
        data: data || [],
        total: typeof count === 'number' ? count : Array.isArray(data) ? data.length : 0,
      });
    } catch (error) {
      console.error('Error al obtener los turnos (lista):', error);
      return res.status(500).json({ success: false, message: 'Error al obtener los turnos.' });
    }
  }

  try {
    const turnos = await turnoModel.getTurnosByDate(date);
    return res.json({ success: true, data: turnos });
  } catch (error) {
    console.error('Error al obtener los turnos:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
}

async function handleGetTurnoFormData(req, res) {
  try {
    const data = await turnoModel.getTurnoFormData();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error al obtener datos de formulario de turno:', error);
    res.status(500).json({ success: false, message: 'No se pudo cargar la información necesaria.' });
  }
}

async function handleCreateTurno(req, res) {
  const loggedInUserId = req.headers['x-user-id']
    ? parseInt(req.headers['x-user-id'], 10)
    : null;

  const {
    departamento_id,
    consultorio_id,
    inicio,
    duracion_min,
    nino_id,
    notas,
    profesional_ids,
    precio,
    moneda,
    metodo_pago,
    estado,
  } = req.body || {};

  if (!departamento_id || !inicio || !nino_id) {
    return res.status(400).json({
      success: false,
      message:
        'Los campos departamento_id, inicio y nino_id son obligatorios para crear un turno.',
    });
  }

  try {
    const nuevoTurno = await turnoModel.createTurno({
      departamento_id,
      consultorio_id,
      inicio,
      duracion_min,
      nino_id,
      notas,
      profesional_ids,
      precio,
      moneda,
      metodo_pago,
      estado,
      creado_por: loggedInUserId,
    });

    res.status(201).json({ success: true, data: nuevoTurno });
  } catch (error) {
    console.error('Error al crear el turno:', error);
    res.status(500).json({ success: false, message: 'No se pudo crear el turno.' });
  }
}




async function handleUpdateTurno(req, res) {
  const { id } = req.params;
  const dataToUpdate = { ...req.body };
  const loggedInUserIdHeader = req.headers['x-user-id'];
  const loggedInUserId = loggedInUserIdHeader ? Number.parseInt(loggedInUserIdHeader, 10) : null;

  if (!loggedInUserId || Number.isNaN(loggedInUserId)) {
    return res.status(401).json({ success: false, message: 'No autorizado: Falta el ID de usuario.' });
  }

  if (!id || Object.keys(dataToUpdate).length === 0) {
    return res.status(400).json({ success: false, message: 'Se requiere el ID del turno y datos para actualizar.' });
  }

  if (Object.prototype.hasOwnProperty.call(dataToUpdate, 'nino_id')) {
    const parsedNinoId = parseNumericId(dataToUpdate.nino_id);
    if (parsedNinoId === null && dataToUpdate.nino_id !== null) {
      return res.status(400).json({ success: false, message: 'El valor de nino_id no es válido.' });
    }
    dataToUpdate.nino_id = parsedNinoId;
  }

  try {
    const adminOverride = await userIsAdmin(loggedInUserId);
    // Permisos para actualizar
    const turno = await turnoModel.getTurnoById(id);
    if (!turno) {
      return res.status(404).json({ success: false, message: 'Turno no encontrado.' });
    }

    const profesionalIds = turno.profesional_ids ? turno.profesional_ids.split(',') : [];
    if (!adminOverride && !profesionalIds.includes(String(loggedInUserId))) {
      return res.status(403).json({ success: false, message: 'No tiene permisos para modificar este turno.' });
    }

    const result = await turnoModel.updateTurno(id, dataToUpdate);
    if (result.affectedRows === 0) {
      // Fallback
      return res.status(404).json({ success: false, message: 'Turno no encontrado durante la actualización.' });
    }

    // Si se cambió el estado, crear una notificación para cada profesional
    if (dataToUpdate.estado) {
      const fullName = `${turno.paciente_nombre} ${turno.paciente_apellido}`;
      let mensaje;

      switch (dataToUpdate.estado) {
        case 'completado':
          mensaje = `Llego ${fullName}`;
          break;
        case 'no_presento':
          mensaje = `No se presento ${fullName}`;
          break;
        case 'cancelado':
          mensaje = `Cancelado el turno de ${fullName}`;
          break;
        default:
          mensaje = `El estado del turno para ${fullName} ha cambiado a: ${dataToUpdate.estado.toUpperCase()}`;
          break;
      }

      const profesionalIds = turno.profesional_ids ? turno.profesional_ids.split(',') : [];
      profesionalIds.forEach(profId => {
        notificacionModel.createNotificacion(profId, mensaje, id);
      });
    }

    res.json({
      success: true,
      message: 'Turno actualizado correctamente.',
    });
  } catch (error) {
    console.error('Error al actualizar el turno:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
}

async function handleAutoScheduleEntrevista(req, res) {
  const {
    nino_id: ninoIdRaw,
    consultorio_id: consultorioIdRaw,
    base_inicio: baseInicioRaw,
    replace_existing: replaceExistingRaw,
  } = req.body || {};
  const loggedInUserIdHeader = req.headers['x-user-id'];
  const loggedInUserId = loggedInUserIdHeader ? Number.parseInt(loggedInUserIdHeader, 10) : null;

  const parsedNinoId = parseNumericId(ninoIdRaw);
  if (!parsedNinoId) {
    return res.status(400).json({ success: false, message: 'Se requiere un nino_id válido para programar turnos.' });
  }

  const parsedConsultorio = parseNumericId(consultorioIdRaw);
  const baseInicio = baseInicioRaw ? new Date(baseInicioRaw) : null;

  try {
    const replaceExisting =
      replaceExistingRaw === true || String(replaceExistingRaw).toLowerCase() === 'true';

    if (replaceExisting) {
      await cancelAutoScheduledTurnosForNino(parsedNinoId);
    }

    const suggestions = await generateTurnoSuggestionsForNino({
      ninoId: parsedNinoId,
      baseInicio: Number.isNaN(baseInicio?.getTime()) ? null : baseInicio,
      consultorioId: parsedConsultorio,
    });

    return res.json({
      success: true,
      data: suggestions,
      total: Array.isArray(suggestions?.propuestas) ? suggestions.propuestas.length : 0,
    });
  } catch (error) {
    console.error('Error al programar turnos automáticos desde entrevista:', error);
    return res.status(500).json({
      success: false,
      message: 'No se pudieron programar los turnos solicitados.',
      error: error?.message || error,
    });
  }
}

async function handleCancelAutoScheduleEntrevista(req, res) {
  const { nino_id: ninoIdRaw } = req.body || {};
  const parsedNinoId = parseNumericId(ninoIdRaw);

  if (!parsedNinoId) {
    return res.status(400).json({ success: false, message: 'Se requiere un nino_id válido para cancelar turnos automáticos.' });
  }

  try {
    const cancelled = await cancelAutoScheduledTurnosForNino(parsedNinoId);
    return res.json({
      success: true,
      data: cancelled,
      total: cancelled.length,
    });
  } catch (error) {
    console.error('Error al cancelar turnos automáticos de entrevista:', error);
    return res.status(500).json({
      success: false,
      message: 'No se pudieron cancelar los turnos automáticos.',
      error: error?.message || error,
    });
  }
}

module.exports = {
  handleGetTurnos,
  handleGetTurnoFormData,
  handleCreateTurno,
  handleUpdateTurno,
  handleAutoScheduleEntrevista,
  handleCancelAutoScheduleEntrevista,
};
