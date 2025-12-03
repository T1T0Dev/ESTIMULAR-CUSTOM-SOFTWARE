const { supabaseAdmin } = require('../config/db');

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
            .select('id, monto, estado, registrado_en, turno_id, turno:turnos ( id, inicio, estado )')
            .gte('registrado_en', desdeIso)
            .lt('registrado_en', hastaIso);

        if (pagosError) throw pagosError;

        // También necesitamos los turnos del año para calcular deberes (pendientes) del mes.
        const { data: turnos, error: turnosError } = await supabaseAdmin
            .from('turnos')
            .select('id, inicio')
            .gte('inicio', desdeIso)
            .lt('inicio', hastaIso);

        if (turnosError) throw turnosError;

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

            const pagosMes = (pagos || []).filter((p) => {
                const f = p.registrado_en ? new Date(p.registrado_en) : null;
                return f && f.toISOString() >= inicioMesIso && f.toISOString() < finMesIso;
            });

            const deberes = (pagos || [])
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
                .reduce((sum, p) => sum + Number(p.monto || 0), 0);

            const haberes = pagosMes
                .filter((p) => p.estado === 'completado')
                .reduce((sum, p) => sum + Number(p.monto || 0), 0);

            const cobrosMesesAnteriores = pagosMes
                .filter((p) => {
                    if (p.estado !== 'completado') return false;
                    const turno = p.turno || null;
                    const f = turno && turno.inicio ? new Date(turno.inicio) : null;
                    if (!f) return false;
                    return f.toISOString() < inicioMesIso;
                })
                .reduce((sum, p) => sum + Number(p.monto || 0), 0);

            const id = `${anio}-${String(mesIndex + 1).padStart(2, '0')}`;
            const labelMes = `${labelsMes[mesIndex]} ${anio}`;

            return {
                id,
                mes: labelMes,
                deberes,
                haberes,
                cobrosMesesAnteriores,
                // Ganancia neta = (Cobros de meses anteriores + Ganancia bruta) - Deberes
                gananciaNeta: cobrosMesesAnteriores + haberes - deberes,
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

        const now = new Date();
        const resumenPorDepartamento = new Map();

        (pagos || []).forEach((pago) => {
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
                });
            }

            const item = resumenPorDepartamento.get(depId);
            const monto = Number(pago.monto || 0);

            const turnoInicio = turno.inicio ? new Date(turno.inicio) : null;
            const turnoInicioIso = turnoInicio ? turnoInicio.toISOString() : null;

            const esDelMesActual =
                turnoInicioIso && turnoInicioIso >= inicioMesIso && turnoInicioIso < finMesIso &&
                turnoInicioIso <= now.toISOString();

            if (pago.estado === 'pendiente' && esDelMesActual) {
                item.deberes += monto;
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

