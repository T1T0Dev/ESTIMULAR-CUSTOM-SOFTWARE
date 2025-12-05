const { supabaseAdmin } = require('../config/db');

const PAGO_ESTADO_COMPLETADO = new Set(['completado']);
const MONTO_DIFF_MINIMO_PARA_DESCUENTO = 5;
const DESCUENTO_MINIMO_RELATIVO = 0.01;

function normalizeDepartamentoId(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function toPositiveNumber(value) {
    if (value === null || value === undefined) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return null;
    if (parsed <= 0) return null;
    return Number(parsed.toFixed(2));
}

function clampDiscount(value) {
    if (value === null || value === undefined) return 0;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return 0;
    if (parsed < 0) return 0;
    if (parsed > 1) return 1;
    return parsed;
}

function parseNotas(notas) {
    if (!notas || typeof notas !== 'string') {
        return null;
    }
    try {
        const parsed = JSON.parse(notas);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed;
        }
        return null;
    } catch (_err) {
        return null;
    }
}

const listProfesiones = async (_req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('profesiones')
            .select(
                'id_departamento, nombre, descripcion, duracion_default_min, responsable_id, precio_default, precio_actualizado_en'
            )
            .order('nombre', { ascending: true });
        if (error) throw error;
        return res.json({ success: true, data: data || [] });
    } catch (err) {
        console.error('listProfesiones error:', err);
        return res
            .status(500)
            .json({ success: false, message: 'Error al obtener profesiones', error: err.message });
    }
};

const adjustProfesionesPrecios = async (req, res) => {
    const { actualizaciones, aplicar_desde: aplicarDesde } = req.body || {};

    if (!Array.isArray(actualizaciones) || actualizaciones.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Se requieren actualizaciones con departamento_id y nuevo_precio.',
        });
    }
    const effectiveDate = aplicarDesde ? new Date(aplicarDesde) : null;
    if (!effectiveDate || Number.isNaN(effectiveDate.getTime())) {
        return res.status(400).json({
            success: false,
            message: 'La fecha "aplicar_desde" es requerida y debe ser válida.',
        });
    }
    effectiveDate.setHours(0, 0, 0, 0);
    const effectiveIso = effectiveDate.toISOString();

    const updates = actualizaciones
        .map((item) => {
            const departamentoId =
                normalizeDepartamentoId(item?.departamento_id ?? item?.id_departamento);
            const nuevoPrecio = toPositiveNumber(item?.nuevo_precio ?? item?.precio);
            if (!departamentoId || !nuevoPrecio) {
                return null;
            }
            return {
                departamento_id: departamentoId,
                nuevo_precio: nuevoPrecio,
            };
        })
        .filter(Boolean);

    if (updates.length === 0) {
        return res.status(400).json({
            success: false,
            message:
                'Ninguna de las actualizaciones incluye un departamento válido y un nuevo precio mayor a 0.',
        });
    }

    const ahoraIso = new Date().toISOString();
    const precioPorDepartamento = new Map();
    updates.forEach((update) => {
        precioPorDepartamento.set(update.departamento_id, update.nuevo_precio);
    });

    try {
        for (const update of updates) {
            const { error: updateError } = await supabaseAdmin
                .from('profesiones')
                .update({
                    precio_default: update.nuevo_precio,
                    precio_actualizado_en: ahoraIso,
                })
                .eq('id_departamento', update.departamento_id);

            if (updateError) {
                throw updateError;
            }
        }

        const departamentoIds = updates.map((update) => update.departamento_id);

        const { data: turnosData, error: turnosError } = await supabaseAdmin
            .from('turnos')
            .select('id, departamento_id, nino_id, inicio')
            .in('departamento_id', departamentoIds)
            .gte('inicio', effectiveIso);

        if (turnosError) {
            throw turnosError;
        }

        const turnos = Array.isArray(turnosData) ? turnosData : [];
        if (turnos.length === 0) {
            return res.json({
                success: true,
                message: 'Precios actualizados. No se encontraron turnos futuros para ajustar.',
                data: {
                    departamentos_actualizados: updates.length,
                    turnos_afectados: 0,
                    pagos_actualizados: 0,
                },
            });
        }

        const turnoIds = turnos.map((turno) => turno.id).filter((id) => Number.isInteger(id));

        const { data: pagosData, error: pagosError } = await supabaseAdmin
            .from('pagos')
            .select('id, turno_id, monto, estado, notas, moneda')
            .in('turno_id', turnoIds);

        if (pagosError) {
            throw pagosError;
        }

        const pagos = Array.isArray(pagosData) ? pagosData : [];
        const pagosPorTurno = new Map();
        pagos.forEach((pago) => {
            const turnoId = Number(pago.turno_id);
            if (!Number.isInteger(turnoId)) return;
            if (!pagosPorTurno.has(turnoId)) {
                pagosPorTurno.set(turnoId, []);
            }
            pagosPorTurno.get(turnoId).push(pago);
        });

        let pagosActualizados = 0;

        for (const turno of turnos) {
            const turnoId = turno.id;
            const nuevoPrecio = precioPorDepartamento.get(turno.departamento_id);
            if (!nuevoPrecio) continue;

            const pagosTurno = pagosPorTurno.get(turnoId) || [];
            for (const pago of pagosTurno) {
                if (PAGO_ESTADO_COMPLETADO.has(String(pago.estado).toLowerCase())) {
                    continue;
                }

                const notasParsed = parseNotas(pago.notas);
                let descuentoAplicado = notasParsed?.descuento_aplicado;
                let descuentoNormalizado = clampDiscount(descuentoAplicado);

                if (!notasParsed || descuentoAplicado === undefined) {
                    const montoActual = Number(pago.monto);
                    const montoOriginalPrevio = notasParsed?.monto_original
                        ? Number(notasParsed.monto_original)
                        : null;

                    if (montoOriginalPrevio && montoOriginalPrevio > 0) {
                        const diferenciaPrevio = Math.abs(montoOriginalPrevio - montoActual);
                        const ratio = 1 - montoActual / montoOriginalPrevio;
                        if (
                            diferenciaPrevio >= MONTO_DIFF_MINIMO_PARA_DESCUENTO ||
                            Math.abs(ratio) >= DESCUENTO_MINIMO_RELATIVO
                        ) {
                            descuentoNormalizado = clampDiscount(ratio);
                        } else {
                            descuentoNormalizado = 0;
                        }
                    } else if (montoActual > 0 && nuevoPrecio > 0) {
                        const diferenciaNueva = Math.abs(nuevoPrecio - montoActual);
                        const ratio = 1 - montoActual / nuevoPrecio;
                        if (
                            diferenciaNueva >= MONTO_DIFF_MINIMO_PARA_DESCUENTO ||
                            Math.abs(ratio) >= DESCUENTO_MINIMO_RELATIVO
                        ) {
                            descuentoNormalizado = clampDiscount(ratio);
                        } else {
                            descuentoNormalizado = 0;
                        }
                    } else {
                        descuentoNormalizado = 0;
                    }
                }

                if (descuentoNormalizado > 0) {
                    const montoEsperadoConDescuento = nuevoPrecio * (1 - descuentoNormalizado);
                    const diferenciaRespectoPrecio = Math.abs(nuevoPrecio - montoEsperadoConDescuento);
                    if (
                        diferenciaRespectoPrecio < MONTO_DIFF_MINIMO_PARA_DESCUENTO &&
                        descuentoNormalizado < DESCUENTO_MINIMO_RELATIVO
                    ) {
                        descuentoNormalizado = 0;
                    }
                }

                const montoFinal = Math.max(
                    0,
                    Number((nuevoPrecio * (1 - descuentoNormalizado)).toFixed(2))
                );

                const notasActualizadas = {
                    ...(notasParsed && typeof notasParsed === 'object' ? notasParsed : {}),
                    monto_original: nuevoPrecio,
                    descuento_aplicado: descuentoNormalizado,
                };

                const payloadUpdate = {
                    monto: montoFinal,
                    actualizado_en: ahoraIso,
                    notas: JSON.stringify(notasActualizadas),
                };

                const { error: pagoUpdateError } = await supabaseAdmin
                    .from('pagos')
                    .update(payloadUpdate)
                    .eq('id', pago.id);

                if (pagoUpdateError) {
                    throw pagoUpdateError;
                }

                pagosActualizados += 1;
            }
        }

        return res.json({
            success: true,
            message: 'Precios actualizados correctamente.',
            data: {
                departamentos_actualizados: updates.length,
                turnos_afectados: turnos.length,
                pagos_actualizados: pagosActualizados,
            },
        });
    } catch (err) {
        console.error('adjustProfesionesPrecios error:', err);
        return res.status(500).json({
            success: false,
            message: 'No se pudieron actualizar los precios.',
            error: err.message,
        });
    }
};

module.exports = { listProfesiones, adjustProfesionesPrecios };
