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

            const idsTurnosMes = new Set(turnosMes.map((t) => t.id));

            const deberes = (pagos || [])
                .filter((p) => {
                    if (p.estado !== 'pendiente') return false;
                    const turno = p.turno || null;
                    if (!turno || turno.estado !== 'confirmado') return false;
                    const f = turno.inicio ? new Date(turno.inicio) : null;
                    return (
                        f &&
                        f.toISOString() >= inicioMesIso &&
                        f.toISOString() < finMesIso
                    );
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

module.exports = { getResumenMensual };

