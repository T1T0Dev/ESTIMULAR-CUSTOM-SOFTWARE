const pagoModel = require('../models/pagoModel');
const { supabaseAdmin } = require('../config/db');

const PENDING_PAYMENT_STATES = ['pendiente', 'parcial'];

function toIsoString(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toNumber(value) {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
function formatResponsableLink(link) {
  if (!link || typeof link !== 'object') return null;
  const responsable = link.responsable || null;
  if (!responsable) return null;
  return {
    id_responsable: responsable.id_responsable || null,
    nombre: responsable.nombre || null,
    apellido: responsable.apellido || null,
    telefono: responsable.telefono || null,
    email: responsable.email || null,
    parentesco: link.parentesco || null,
    es_principal: !!link.es_principal,
  };
}
function pickPrimaryResponsable(responsables = []) {
  if (!Array.isArray(responsables)) return null;
  const principal = responsables.find(
    (rel) => rel?.es_principal && rel?.responsable
  );
  if (principal) {
    return formatResponsableLink(principal);
  }
  const fallback = responsables.find((rel) => rel?.responsable);
  if (fallback) {
    return formatResponsableLink(fallback);
  }
  return null;
}

async function handleGetPagos(req, res) {
  const { turno_id } = req.query;
  if (!turno_id) {
    return res.status(400).json({ success: false, message: "El parámetro 'turno_id' es requerido." });
  }
  try {
    const pagos = await pagoModel.getPagosByTurnoId(turno_id);
    res.json({ success: true, data: pagos });
  } catch (error) {
    console.error('Error al obtener los pagos:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
}

async function handleGetPacienteDeudaStatus(req, res) {
  const { paciente_dni } = req.query;
  if (!paciente_dni) {
    return res.status(400).json({ success: false, message: "El parámetro 'paciente_dni' es requerido." });
  }
  try {
    // Obtener todos los pagos pendientes del paciente
    const pagosPendientes = await pagoModel.getPagosPendientesByPacienteDni(paciente_dni);
    
    const totalDeuda = pagosPendientes.reduce((sum, pago) => sum + toNumber(pago.monto), 0);
    const cantidadPagosPendientes = pagosPendientes.length;
    
    res.json({ 
      success: true, 
      data: {
        tiene_deuda: totalDeuda > 0,
        total_deuda: totalDeuda,
        cantidad_pagos_pendientes: cantidadPagosPendientes,
        pagos_pendientes: pagosPendientes
      }
    });
  } catch (error) {
    console.error('Error al obtener estado de deuda del paciente:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
}




async function handleUpdatePago(req, res) {
  const { id } = req.params;
  const { estado, turno_id, metodo } = req.body;

  if (!estado || !turno_id) {
    return res.status(400).json({ success: false, message: "Se requiere 'estado' y 'turno_id'." });
  }

  const cleanMetodo = typeof metodo === 'string' ? metodo.trim() : '';
  if (estado === 'completado' && !cleanMetodo) {
    return res.status(400).json({ success: false, message: 'Debe especificar un método de pago para completar el pago.' });
  }

  const updates = { estado };
  if (cleanMetodo) {
    updates.metodo = cleanMetodo;
  }

  try {
    const result = await pagoModel.updatePago(id, updates);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Pago no encontrado.' });
    }


    const todosLosPagos = await pagoModel.getPagosByTurnoId(turno_id);
    const todosPagados = todosLosPagos.every(p => p.estado === 'completado');
    const algunoPagado = todosLosPagos.some(p => p.estado === 'completado');

    let nuevoEstadoPagoTurno = 'pendiente';
    if (todosPagados) {
      nuevoEstadoPagoTurno = 'pagado';
    } else if (algunoPagado) {
      nuevoEstadoPagoTurno = 'parcial';
    }

    await pagoModel.updateTurnoEstadoPago(turno_id, nuevoEstadoPagoTurno);

    res.json({ success: true, message: 'Pago actualizado correctamente.' });
  } catch (error) {
    console.error('Error al actualizar el pago:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
}

async function handleGetPagosDashboardDeudas(req, res) {
  try {
    const { data: pagos, error } = await supabaseAdmin
      .from('pagos')
      .select(
        `
        id,
        turno_id,
        nino_id,
        monto,
        moneda,
        metodo,
        estado,
        notas,
        registrado_en,
        actualizado_en,
        turno:turnos!pagos_turno_id_fkey (
          id,
          inicio,
          fin,
          estado,
          departamento_id,
          nino_id,
          consultorio:consultorios!turnos_consultorio_id_fkey (
            id,
            nombre,
            ubicacion
          ),
          servicio:profesiones!turnos_departamento_id_fkey (
            id_departamento,
            nombre
          )
        )
      `
      )
      .in('estado', PENDING_PAYMENT_STATES)
      .order('registrado_en', { ascending: true });

    if (error) throw error;

    if (!Array.isArray(pagos) || pagos.length === 0) {
      return res.json({
        success: true,
        data: [],
        totals: {
          total_pendiente: 0,
          cantidad_turnos: 0,
          cantidad_ninos: 0,
        },
      });
    }

    const childIds = Array.from(
      new Set(
        pagos
          .map((pago) => pago.nino_id || pago?.turno?.nino_id || null)
          .filter((value) => Number.isInteger(value))
      )
    );

    let ninosDetalles = new Map();
    if (childIds.length > 0) {
      const { data: ninosData, error: ninosError } = await supabaseAdmin
        .from('ninos')
        .select(
          `
          id_nino,
          nombre,
          apellido,
          obra_social:obras_sociales!ninos_id_obra_social_fkey ( nombre_obra_social ),
          responsables:nino_responsables (
            id_nino_responsable,
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
        `
        )
        .in('id_nino', childIds);

      if (ninosError) throw ninosError;

      (ninosData || []).forEach((row) => {
        ninosDetalles.set(row.id_nino, row);
      });
    }

    const agrupadas = new Map();
    const nowMs = Date.now();

    pagos.forEach((pago) => {
      const turno = pago.turno || null;
      const turnoId = turno?.id || pago.turno_id || null;
      if (!turno || !turnoId) {
        return;
      }

      const estadoTurno = typeof turno.estado === 'string' ? turno.estado.toLowerCase() : '';
      if (estadoTurno !== 'confirmado') {
        return;
      }

      const turnoFechaCruda = turno.fin || turno.inicio || null;
      const turnoFecha = turnoFechaCruda ? new Date(turnoFechaCruda) : null;
      if (!turnoFecha || Number.isNaN(turnoFecha.getTime())) {
        return;
      }

      if (turnoFecha.getTime() > nowMs) {
        return;
      }

      const ninoId = pago.nino_id || turno.nino_id || null;
      if (!Number.isInteger(ninoId)) return;

      const key = String(ninoId);
      if (!agrupadas.has(key)) {
        agrupadas.set(key, {
          nino_id: ninoId,
          nino: ninosDetalles.get(ninoId) || null,
          moneda: pago.moneda || 'ARS',
          monto_total_pendiente: 0,
          fecha_ultima_cuota_impaga: null,
          turnos: new Map(),
        });
      }

      const registro = agrupadas.get(key);
      const monto = toNumber(pago.monto);
      registro.monto_total_pendiente += monto;
      if (!registro.moneda && pago.moneda) {
        registro.moneda = pago.moneda;
      }

      const fechaPago = toIsoString(pago.registrado_en || pago.actualizado_en);
      if (fechaPago) {
        if (!registro.fecha_ultima_cuota_impaga || fechaPago > registro.fecha_ultima_cuota_impaga) {
          registro.fecha_ultima_cuota_impaga = fechaPago;
        }
      }

      const turnoKey = turnoId ? String(turnoId) : `pago-${pago.id}`;
      if (!registro.turnos.has(turnoKey)) {
        registro.turnos.set(turnoKey, {
          turno_id: turnoId,
          inicio: toIsoString(turno.inicio),
          fin: toIsoString(turno.fin),
          estado: turno.estado || null,
          estado_pago: turno.estado_pago || null,
          servicio_nombre:
            (turno.servicio && (turno.servicio.nombre || turno.servicio.nombre_obra_social)) || null,
          departamento_id:
            turno.departamento_id || (turno.servicio && turno.servicio.id_departamento) || null,
          consultorio_nombre: turno.consultorio ? turno.consultorio.nombre || null : null,
          total_pendiente: 0,
          moneda: pago.moneda || registro.moneda || 'ARS',
          pagos: [],
        });
      }

      const turnoRegistro = registro.turnos.get(turnoKey);
      turnoRegistro.total_pendiente += monto;
      if (!turnoRegistro.moneda && pago.moneda) {
        turnoRegistro.moneda = pago.moneda;
      }
      turnoRegistro.pagos.push({
        id: pago.id,
        turno_id: turnoId,
        monto,
        moneda: pago.moneda || turnoRegistro.moneda || 'ARS',
        metodo: pago.metodo,
        estado: pago.estado,
        notas: pago.notas || null,
        registrado_en: toIsoString(pago.registrado_en),
        actualizado_en: toIsoString(pago.actualizado_en),
      });
    });

    const resultado = Array.from(agrupadas.values()).map((registro) => {
      const nino = registro.nino;
      const responsables = Array.isArray(nino?.responsables)
        ? nino.responsables.map((rel) => ({
            id_nino_responsable: rel.id_nino_responsable || null,
            parentesco: rel.parentesco || null,
            es_principal: !!rel.es_principal,
            responsable: rel.responsable
              ? {
                  id_responsable: rel.responsable.id_responsable || null,
                  nombre: rel.responsable.nombre || null,
                  apellido: rel.responsable.apellido || null,
                  telefono: rel.responsable.telefono || null,
                  email: rel.responsable.email || null,
                }
              : null,
          }))
        : [];

      const responsablePrincipal = pickPrimaryResponsable(
        Array.isArray(nino?.responsables) ? nino.responsables : []
      );

      return {
        nino: {
          id_nino: registro.nino_id,
          nombre: nino?.nombre || null,
          apellido: nino?.apellido || null,
          obra_social: nino?.obra_social?.nombre_obra_social || null,
        },
        responsable: responsablePrincipal,
        responsables,
        fecha_ultima_cuota_impaga: registro.fecha_ultima_cuota_impaga,
        monto_total_pendiente: Number(registro.monto_total_pendiente.toFixed(2)),
        moneda: registro.moneda || 'ARS',
        turnos: Array.from(registro.turnos.values()).map((turnoItem) => ({
          ...turnoItem,
          total_pendiente: Number(turnoItem.total_pendiente.toFixed(2)),
        })),
      };
    });

    resultado.sort((a, b) => b.monto_total_pendiente - a.monto_total_pendiente);

    const totals = resultado.reduce(
      (acc, item) => {
        acc.total_pendiente += item.monto_total_pendiente;
        acc.cantidad_turnos += item.turnos.length;
        acc.cantidad_ninos += 1;
        return acc;
      },
      { total_pendiente: 0, cantidad_turnos: 0, cantidad_ninos: 0 }
    );

    totals.total_pendiente = Number(totals.total_pendiente.toFixed(2));

    return res.json({
      success: true,
      data: resultado,
      totals,
    });
  } catch (error) {
    console.error('Error al cargar deudas de pagos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener deudas de pagos.',
      error: error.message,
    });
  }
}

async function handleGetPacienteDeudaStatus(req, res) {
  const { paciente_dni } = req.query;
  
  if (!paciente_dni) {
    return res.status(400).json({ 
      success: false, 
      message: "El parámetro 'paciente_dni' es requerido." 
    });
  }

  try {
    const pagosPendientes = await pagoModel.getPagosPendientesByPacienteDni(paciente_dni);
    
    const totalDeuda = pagosPendientes.reduce((sum, pago) => sum + toNumber(pago.monto), 0);
    const cantidadPagosPendientes = pagosPendientes.length;
    
    return res.json({
      success: true,
      data: {
        paciente_dni,
        tiene_deuda: totalDeuda > 0,
        total_deuda: Number(totalDeuda.toFixed(2)),
        cantidad_pagos_pendientes: cantidadPagosPendientes,
        pagos_pendientes: pagosPendientes
      }
    });
  } catch (error) {
    console.error('Error al obtener estado de deuda del paciente:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estado de deuda del paciente.',
      error: error.message,
    });
  }
}

module.exports = {
  handleGetPagos,
  handleUpdatePago,
  handleGetPagosDashboardDeudas,
  handleGetPacienteDeudaStatus,
};
