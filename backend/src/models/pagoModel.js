const supabase = require("../config/db");

async function getPagosByTurnoId(turnoId) {
  const { data, error } = await supabase
    .from("pagos")
    .select("*")
    .eq("turno_id", turnoId);

  if (error) throw error;
  return data;
}

async function updatePagoStatus(pagoId, estado) {
  const { data, error } = await supabase
    .from("pagos")
    .update({ estado })
    .eq("id", pagoId)
    .select("id");

  if (error) throw error;
  return { affectedRows: data ? data.length : 0 };
}

async function updateTurnoEstadoPago(turnoId, estado_pago) {
  const payload = { estado_pago, actualizado_en: new Date().toISOString() };

  const { data, error } = await supabase
    .from("turnos")
    .update(payload)
    .eq("id", turnoId)
    .select("id");

  if (error) {
    if (error.code === "42703") {
      // Columna no existe en la nueva estructura; ignorar silenciosamente.
      console.warn(
        "La columna estado_pago no existe en turnos. Se omite la actualización del estado de pago."
      );
      return { affectedRows: 0, skipped: true };
    }
    throw error;
  }

  return { affectedRows: data ? data.length : 0 };
}

module.exports = {
  getPagosByTurnoId,
  updatePagoStatus,
  updateTurnoEstadoPago,
};
