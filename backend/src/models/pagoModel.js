const supabase = require("../config/db");

async function getPagosByTurnoId(turnoId) {
  const { data, error } = await supabase
    .from("pagos")
    .select("*")
    .eq("turno_id", turnoId);

  if (error) throw error;
  return data;
}

async function updatePago(pagoId, updates = {}) {
  const payload = { ...updates };
  if (!payload || Object.keys(payload).length === 0) {
    throw new Error('No fields to update for pago');
  }

  payload.actualizado_en = new Date().toISOString();

  const { data, error } = await supabase
    .from('pagos')
    .update(payload)
    .eq('id', pagoId)
    .select('id');

  if (error) throw error;
  return { affectedRows: Array.isArray(data) ? data.length : 0 };
}

async function updateTurnoEstadoPago(turnoId, estado_pago) {
  const payload = { estado_pago, actualizado_en: new Date().toISOString() };

  const { data, error } = await supabase
    .from("turnos")
    .update(payload)
    .eq("id", turnoId)
    .select("id");

  if (error) {
    const errorCode = error.code;
    const errorMessage = typeof error.message === "string" ? error.message : "";

    if (
      errorCode === "42703" ||
      errorCode === "PGRST204" ||
      errorMessage.includes("'estado_pago' column")
    ) {
      // Columna no existe en el esquema actual; omitir actualización suavemente.
      console.warn(
        "La columna estado_pago no existe en turnos. Se omite la actualización del estado de pago."
      );
      return { affectedRows: 0, skipped: true };
    }

    throw error;
  }

  return { affectedRows: data ? data.length : 0 };
}

async function getPagosPendientesByPacienteDni(pacienteDni) {
  // First get turnos for this paciente
  const { data: turnosData, error: turnosError } = await supabase
    .from("turnos")
    .select("id")
    .eq("paciente_dni", pacienteDni);

  if (turnosError) throw turnosError;
  
  if (!turnosData || turnosData.length === 0) {
    return [];
  }

  const turnoIds = turnosData.map(t => t.id);

  // Then get pagos pendientes for these turnos
  const { data, error } = await supabase
    .from("pagos")
    .select(`
      *,
      turno:turnos!pagos_turno_id_fkey (
        id,
        paciente_dni,
        paciente_nombre,
        paciente_apellido,
        fecha:DATE(inicio)
      )
    `)
    .eq("estado", "pendiente")
    .in("turno_id", turnoIds);

  if (error) throw error;
  return data || [];
}

module.exports = {
  getPagosByTurnoId,
  updatePago,
  updateTurnoEstadoPago,
  getPagosPendientesByPacienteDni,
};
