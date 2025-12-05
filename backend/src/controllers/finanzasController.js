const { supabaseAdmin } = require('../config/db');

function clampPercent(value) {
    if (value === null || value === undefined) return 0;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return 0;
    if (parsed < 0) return 0;
    if (parsed > 1) return 1;
    return parsed;
}

function parseObraSocialDescuento(raw) {
    if (raw === null || raw === undefined) {
        return { tipo: 'ninguno', valor: 0 };
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed <= 0) {
        return { tipo: 'ninguno', valor: 0 };
    }
    if (parsed > 1) {
        return { tipo: 'monto', valor: Number(parsed.toFixed(2)) };
    }
    return { tipo: 'porcentaje', valor: clampPercent(parsed) };
}

function parseNotasJson(rawNotas) {
    if (!rawNotas || typeof rawNotas !== 'string') {
        return null;
    }
    try {
        const parsed = JSON.parse(rawNotas);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_error) {
        return null;
    }
}

function toAmount(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return 0;
    return Number(parsed.toFixed(2));
}

function computePagoCoberturaInfo(pago, descriptorRaw) {
    const estado = String(pago?.estado || '').toLowerCase();
    const montoActual = toAmount(pago?.monto || 0);
    const notasData = parseNotasJson(pago?.notas);

    if (notasData && typeof notasData === 'object') {
        const notedOriginal = toAmount(
            notasData.monto_original ??
                notasData.montoOriginal ??
                notasData.precio_original ??
                notasData.precioOriginal
        );
        const notedDescuento = toAmount(
            notasData.descuento_monto ??
                notasData.descuentoMonto ??
                notasData.descuento_aplicado_monto
        );

        if (notedOriginal > 0) {
            const cobertura = Math.max(0, Number((notedOriginal - montoActual).toFixed(2)));
            if (cobertura > 0) {
                return {
                    cobertura,
                    saldoPaciente: Math.max(montoActual, 0),
                    montoOriginal: notedOriginal,
                };
            }
        }

        if (notedDescuento > 0) {
            const cobertura = Math.min(notedDescuento, Math.max(montoActual, 0));
            const saldoPaciente = Math.max(montoActual - cobertura, 0);
            const montoOriginal = saldoPaciente > 0
                ? Number((saldoPaciente + cobertura).toFixed(2))
                : Math.max(montoActual, cobertura);
            return {
                cobertura,
                saldoPaciente,
                montoOriginal,
            };
        }
    }

    const descriptor = descriptorRaw || { tipo: 'ninguno', valor: 0 };

    if (descriptor.tipo === 'monto') {
        const descuento = toAmount(descriptor.valor);
        const monto = Math.max(montoActual, 0);
        if (descuento <= 0) {
            return {
                cobertura: 0,
                saldoPaciente: monto,
                montoOriginal: monto,
            };
        }

        const cobertura = Math.min(descuento, monto);
        if (estado === 'completado') {
            const montoOriginal = Number((monto + cobertura).toFixed(2));
            return {
                cobertura,
                saldoPaciente: monto,
                montoOriginal,
            };
        }

        const saldoPaciente = Math.max(monto - cobertura, 0);
        return {
            cobertura,
            saldoPaciente,
            montoOriginal: monto,
        };
    }

    if (descriptor.tipo === 'porcentaje') {
        const ratio = clampPercent(descriptor.valor);
        const monto = Math.max(montoActual, 0);
        if (ratio <= 0) {
            return {
                cobertura: 0,
                saldoPaciente: monto,
                montoOriginal: monto,
            };
        }

        if (estado === 'completado') {
            if (ratio >= 1) {
                return {
                    cobertura: 0,
                    saldoPaciente: monto,
                    montoOriginal: monto,
                };
            }
            const montoOriginal = Number((monto / (1 - ratio)).toFixed(2));
            const cobertura = Math.max(0, Number((montoOriginal - monto).toFixed(2)));
            return {
                cobertura,
                saldoPaciente: monto,
                montoOriginal,
            };
        }

        const cobertura = Number((monto * ratio).toFixed(2));
        const saldoPaciente = Math.max(monto - cobertura, 0);
        return {
            cobertura,
            saldoPaciente,
            montoOriginal: monto,
        };
    }

    const monto = Math.max(montoActual, 0);
    return {
        cobertura: 0,
        saldoPaciente: monto,
        montoOriginal: monto,
    };
}

// GET /api/finanzas/resumen-mensual?anio=2025
// Devuelve por cada mes del año: deberes, haberes y cobros de meses anteriores.
const getResumenMensual = async (req, res) => {
    const anio = Number.parseInt(req.query.anio, 10) || new Date().getFullYear();

    try {
        const inicioAnio = new Date(Date.UTC(anio, 0, 1));
        const finAnio = new Date(Date.UTC(anio + 1, 0, 1));

        const desdeIso = inicioAnio.toISOString();
        const hastaIso = finAnio.toISOString();

        // Cargamos todos los pagos del año (por fecha de registro) junto a su turno.
        const { data: pagos, error: pagosError } = await supabaseAdmin
            .from('pagos')
            .select('id, monto, estado, registrado_en, turno_id, nino_id, notas, turno:turnos ( id, inicio, estado )')
            .gte('registrado_en', desdeIso)
            .lt('registrado_en', hastaIso);

        if (pagosError) throw pagosError;

        const pagosList = Array.isArray(pagos) ? pagos : [];

        const ninoIds = Array.from(
            new Set(
                pagosList
                    .map((pago) => Number(pago.nino_id))
                    .filter((id) => Number.isInteger(id) && id > 0)
            )
        );

        let descuentosPorNino = new Map();
        if (ninoIds.length > 0) {
            const { data: ninosData, error: ninosError } = await supabaseAdmin
                .from('ninos')
                .select('id_nino, obra_social:obras_sociales!ninos_id_obra_social_fkey ( descuento )')
                .in('id_nino', ninoIds);

            if (ninosError) throw ninosError;

            descuentosPorNino = new Map(
                (ninosData || []).map((nino) => [
                    nino.id_nino,
                    parseObraSocialDescuento(nino?.obra_social?.descuento),
                ])
            );
        }

        // También necesitamos los turnos del año para calcular deberes (pendientes) del mes.
        const { data: turnos, error: turnosError } = await supabaseAdmin
            .from('turnos')
            .select('id, inicio')
            .gte('inicio', desdeIso)
            .lt('inicio', hastaIso);

        if (turnosError) throw turnosError;

        const descuentosMap = descuentosPorNino;

        const pagosConCobertura = pagosList.map((pago) => {
            const descriptor = descuentosMap.get(Number(pago.nino_id)) || null;
            return {
                ...pago,
                coverageInfo: computePagoCoberturaInfo(pago, descriptor),
            };
        });

        const meses = Array.from({ length: 12 }, (_, i) => i); // 0-11
        const labelsMes = [
            'Enero',
            'Febrero',
            'Marzo',
            'Abril',
            'Mayo',
            'Junio',
            'Julio',
            'Agosto',
            'Septiembre',
            'Octubre',
            'Noviembre',
            'Diciembre',
        ];

        const now = new Date();

        const resumen = meses.map((mesIndex) => {
            const inicioMes = new Date(Date.UTC(anio, mesIndex, 1));
            const finMes = new Date(Date.UTC(anio, mesIndex + 1, 1));

            const inicioMesIso = inicioMes.toISOString();
            const finMesIso = finMes.toISOString();

            const turnosMes = (turnos || []).filter((t) => {
                const f = t.inicio ? new Date(t.inicio) : null;
                return f && f.toISOString() >= inicioMesIso && f.toISOString() < finMesIso;
            });

            const pagosMes = pagosConCobertura.filter((p) => {
                const f = p.registrado_en ? new Date(p.registrado_en) : null;
                return f && f.toISOString() >= inicioMesIso && f.toISOString() < finMesIso;
            });

            const deberes = pagosConCobertura
                .filter((p) => {
                    if (p.estado !== 'pendiente') return false;
                    const turno = p.turno || null;
                    if (!turno) return false;
                    const estadoTurno = String(turno.estado || '')
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .toLowerCase();
                    if (estadoTurno !== 'completado') return false;
                    const f = turno.inicio ? new Date(turno.inicio) : null;
                    if (!f) return false;
                    const iso = f.toISOString();
                    if (iso > now.toISOString()) return false;
                    return iso >= inicioMesIso && iso < finMesIso;
                })
                .reduce((sum, p) => {
                    const saldoPaciente = p?.coverageInfo?.saldoPaciente;
                    const base = saldoPaciente ?? p.monto ?? 0;
                    return sum + toAmount(base);
                }, 0);

            const pagosCompletadosMes = pagosMes.filter((p) => p.estado === 'completado');

            const haberes = pagosCompletadosMes.reduce(
                (sum, p) => sum + Number(p.monto || 0),
                0
            );

            const cobrosMesesAnteriores = pagosCompletadosMes
                .filter((p) => {
                    const turno = p.turno || null;
                    const f = turno && turno.inicio ? new Date(turno.inicio) : null;
                    if (!f) return false;
                    return f.toISOString() < inicioMesIso;
                })
                .reduce((sum, p) => sum + Number(p.monto || 0), 0);

            const coberturaObraSocial = pagosConCobertura
                .filter((pago) => {
                    const turno = pago.turno || null;
                    if (!turno) return false;
                    const inicioTurno = turno.inicio ? new Date(turno.inicio) : null;
                    if (!inicioTurno) return false;
                    const iso = inicioTurno.toISOString();
                    if (iso > now.toISOString()) return false;
                    return iso >= inicioMesIso && iso < finMesIso;
                })
                .reduce((sum, pago) => sum + toAmount(pago?.coverageInfo?.cobertura || 0), 0);

            const id = `${anio}-${String(mesIndex + 1).padStart(2, '0')}`;
            const labelMes = `${labelsMes[mesIndex]} ${anio}`;

            return {
                id,
                mes: labelMes,
                deberes,
                haberes,
                cobrosMesesAnteriores,
                coberturaObraSocial,
                // Ganancia neta considera ingresos del mes (obra social + cobros) menos saldos pendientes
                gananciaNeta: cobrosMesesAnteriores + haberes + coberturaObraSocial - deberes,
            };
        });

        return res.json({ success: true, data: resumen });
    } catch (err) {
        console.error('getResumenMensual error', err);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener resumen mensual',
            error: err.message,
        });
    }
};

// GET /api/finanzas/resumen-mensual-detalle?anio=2025&mesIndex=10
// Devuelve para un mes concreto el resumen por departamento
// (solo turnos confirmados/completados), con sumas de deberes y haberes.
const getResumenMensualDetalle = async (req, res) => {
    const anio = Number.parseInt(req.query.anio, 10) || new Date().getFullYear();
    const mesIndex = Number.parseInt(req.query.mesIndex, 10) || 0; // 0-11

    try {
        const inicioMes = new Date(Date.UTC(anio, mesIndex, 1));
        const finMes = new Date(Date.UTC(anio, mesIndex + 1, 1));

        const inicioMesIso = inicioMes.toISOString();
        const finMesIso = finMes.toISOString();

        const { data: pagos, error: pagosError } = await supabaseAdmin
            .from('pagos')
            .select(`
                id,
                monto,
                estado,
                notas,
                nino_id,
                registrado_en,
                turno:turnos!pagos_turno_id_fkey (
                    id,
                    inicio,
                    estado,
                    departamento:profesiones!turnos_departamento_id_fkey (
                        id_departamento,
                        nombre
                    )
                )
            `)
            .gte('registrado_en', inicioMesIso)
            .lt('registrado_en', finMesIso);

        if (pagosError) throw pagosError;

        const pagosList = Array.isArray(pagos) ? pagos : [];

        const ninoIds = Array.from(
            new Set(
                pagosList
                    .map((pago) => Number(pago.nino_id))
                    .filter((id) => Number.isInteger(id) && id > 0)
            )
        );

        let descuentosPorNino = new Map();
        if (ninoIds.length > 0) {
            const { data: ninosData, error: ninosError } = await supabaseAdmin
                .from('ninos')
                .select('id_nino, obra_social:obras_sociales!ninos_id_obra_social_fkey ( descuento )')
                .in('id_nino', ninoIds);

            if (ninosError) throw ninosError;

            descuentosPorNino = new Map(
                (ninosData || []).map((nino) => [
                    nino.id_nino,
                    parseObraSocialDescuento(nino?.obra_social?.descuento),
                ])
            );
        }

        const pagosConCobertura = pagosList.map((pago) => {
            const descriptor = descuentosPorNino.get(Number(pago.nino_id)) || null;
            return {
                ...pago,
                coverageInfo: computePagoCoberturaInfo(pago, descriptor),
            };
        });

        const now = new Date();
        const resumenPorDepartamento = new Map();

        pagosConCobertura.forEach((pago) => {
            const turno = pago.turno || null;
            if (!turno) return;

            const estadoTurnoNormalizado = String(turno.estado || '')
                .normalize('NFD')
                .replace(/[^\p{L}\p{N}\s]/gu, '')
                .toLowerCase();

            if (estadoTurnoNormalizado !== 'completado' && estadoTurnoNormalizado !== 'confirmado') {
                return;
            }

            const departamento = turno.departamento || {};
            const depId = departamento.id_departamento || 0;
            const depNombre = departamento.nombre || 'Sin departamento';

            if (!resumenPorDepartamento.has(depId)) {
                resumenPorDepartamento.set(depId, {
                    departamentoId: depId,
                    departamentoNombre: depNombre,
                    deberes: 0,
                    haberes: 0,
                    coberturaObraSocial: 0,
                });
            }

            const item = resumenPorDepartamento.get(depId);
            const coberturaInfo = pago.coverageInfo || {
                cobertura: 0,
                saldoPaciente: Number(pago.monto || 0),
            };
            const monto = Number(pago.monto || 0);
            const saldoPaciente = toAmount(coberturaInfo.saldoPaciente ?? monto);
            const cobertura = toAmount(coberturaInfo.cobertura || 0);

            const turnoInicio = turno.inicio ? new Date(turno.inicio) : null;
            const turnoInicioIso = turnoInicio ? turnoInicio.toISOString() : null;

            const esDelMesActual =
                turnoInicioIso && turnoInicioIso >= inicioMesIso && turnoInicioIso < finMesIso &&
                turnoInicioIso <= now.toISOString();

            if (pago.estado === 'pendiente' && esDelMesActual) {
                item.deberes += saldoPaciente;
                item.coberturaObraSocial += cobertura;
            }

            if (pago.estado === 'completado') {
                item.haberes += monto;
            }
        });

        const resultado = Array.from(resumenPorDepartamento.values()).sort((a, b) => {
            return String(a.departamentoNombre || '').localeCompare(String(b.departamentoNombre || ''), 'es');
        });

        return res.json({
            success: true,
            data: resultado,
        });
    } catch (err) {
        console.error('getResumenMensualDetalle error', err);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener resumen mensual por departamento',
            error: err.message,
        });
    }
};

module.exports = { getResumenMensual, getResumenMensualDetalle };

