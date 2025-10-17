const { supabaseAdmin } = require('../config/db');

// GET /api/ninos?search=&page=1&pageSize=10&tipo=
const getNinos = async (req, res) => {
    const { search = '', page = 1, pageSize = 10, tipo } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    try {
        const searchSafe = String(search || '').replace(/[%']/g, '').trim();

        let q = supabaseAdmin
            .from('ninos')
            .select(
                `id_nino, nombre, apellido, fecha_nacimiento, dni, certificado_discapacidad, tipo, id_obra_social, responsable_id, 
         obra_social:obras_sociales (id_obra_social, nombre_obra_social),
         responsable:responsables (id_responsable, nombre, apellido, email, telefono)`,
                { count: 'exact' }
            )
            .order('created_at', { ascending: false })
            .range(offset, offset + parseInt(pageSize) - 1);

        if (searchSafe) {
            const pattern = `%${searchSafe}%`;
            q = q.or(`nombre.ilike.${pattern},apellido.ilike.${pattern},dni.ilike.${pattern}`);
        }

        if (tipo && tipo !== 'todos') {
            q = q.eq('tipo', tipo);
        }

        const { data, error, count } = await q;
        if (error) throw error;
        res.json({ success: true, data: data || [], total: count || 0 });
    } catch (err) {
        console.error('getNinos failed:', err);
        res.status(500).json({ success: false, message: 'Error al obtener niños', error: err.message, detail: err });
    }
};

// POST /api/ninos
// body: { nombre, apellido, dni, fecha_nacimiento, certificado_discapacidad, id_obra_social, obra_social_texto, tipo, responsable: { ... } }
const crearNino = async (req, res) => {
    const body = req.body || {};
    const {
        nombre,
        apellido,
        dni,
        fecha_nacimiento,
        certificado_discapacidad = false,
        id_obra_social,
        obra_social_texto,
        tipo = 'candidato',
        responsable: respBody,
    } = body;

    if (!nombre || !apellido) {
        return res.status(400).json({ success: false, message: 'Nombre y apellido son obligatorios' });
    }

    let createdObraId = null;
    let insertedNino = null;
    let insertedResponsable = null;

    try {
        // 1) Obra social: si no hay id y hay texto, crearla en pendiente
        let idObra = id_obra_social ?? null;
        if (!idObra && obra_social_texto && obra_social_texto.trim().length > 0) {
            const nombreOS = obra_social_texto.trim();
            const { data: obraData, error: obraErr } = await supabaseAdmin
                .from('obras_sociales')
                .insert([{ nombre_obra_social: nombreOS, estado: 'pendiente' }])
                .select()
                .single();
            if (obraErr) throw obraErr;
            idObra = obraData.id_obra_social;
            createdObraId = idObra;
        }

        // 2) Si viene responsable (o al menos dni), crear/buscar
        let respId = null;
        if (respBody && (respBody.dni || respBody.nombre || respBody.apellido)) {
            if (respBody.dni) {
                const { data: respFound } = await supabaseAdmin
                    .from('responsables')
                    .select('*')
                    .eq('dni', Number(respBody.dni))
                    .limit(1)
                    .maybeSingle();
                if (respFound) respId = respFound.id_responsable;
            }
            if (!respId) {
                const { data: respIns, error: respInsErr } = await supabaseAdmin
                    .from('responsables')
                    .insert([{
                        nombre: respBody.nombre || respBody.nombre_responsable || null,
                        apellido: respBody.apellido || respBody.apellido_responsable || null,
                        telefono: respBody.telefono || null,
                        email: respBody.email || null,
                        dni: respBody.dni ? Number(respBody.dni) : null,
                    }])
                    .select()
                    .single();
                if (respInsErr) throw respInsErr;
                respId = respIns.id_responsable;
                insertedResponsable = respIns;
            }
        }

        // 3) Insertar niño
        const payload = {
            nombre,
            apellido,
            dni: dni || null,
            fecha_nacimiento: fecha_nacimiento || null,
            certificado_discapacidad: !!certificado_discapacidad,
            id_obra_social: idObra,
            tipo,
            responsable_id: respId || null,
        };
        const { data: nino, error: ninoErr } = await supabaseAdmin
            .from('ninos')
            .insert([payload])
            .select()
            .single();
        if (ninoErr) throw ninoErr;
        insertedNino = nino;

        // 4) Opcional: crear relación en nino_responsables con es_principal
        if (respId) {
            await supabaseAdmin
                .from('nino_responsables')
                .insert([{ id_nino: nino.id_nino, id_responsable: respId, parentesco: respBody?.parentesco || null, es_principal: true }]);
        }

        res.status(201).json({ success: true, data: insertedNino });
    } catch (error) {
        // rollback básicos
        try {
            if (insertedNino) {
                await supabaseAdmin.from('ninos').delete().eq('id_nino', insertedNino.id_nino);
            }
            if (insertedResponsable) {
                await supabaseAdmin.from('responsables').delete().eq('id_responsable', insertedResponsable.id_responsable);
            }
            if (createdObraId) {
                await supabaseAdmin.from('obras_sociales').delete().eq('id_obra_social', createdObraId);
            }
        } catch { }
        console.error('crearNino failed:', error);
        res.status(500).json({ success: false, message: 'Error al crear niño', error: error.message });
    }
};

// PUT /api/ninos/:id_nino
const editarNino = async (req, res) => {
    const { id_nino } = req.params;
    const updateData = req.body || {};
    if (!id_nino) return res.status(400).json({ success: false, message: 'Falta id_nino' });

    const allowed = ['nombre', 'apellido', 'dni', 'fecha_nacimiento', 'certificado_discapacidad', 'id_obra_social', 'tipo', 'responsable_id'];
    const payload = {};
    for (const k of allowed) if (k in updateData) payload[k] = updateData[k];
    if ('certificado_discapacidad' in payload) payload.certificado_discapacidad = !!payload.certificado_discapacidad;
    if (payload.fecha_nacimiento) {
        const d = new Date(payload.fecha_nacimiento);
        if (!isNaN(d)) payload.fecha_nacimiento = d.toISOString().slice(0, 10);
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('ninos')
            .update(payload)
            .eq('id_nino', id_nino)
            .select(`id_nino, nombre, apellido, fecha_nacimiento, dni, certificado_discapacidad, tipo, id_obra_social, responsable_id,
               obra_social:obras_sociales (id_obra_social, nombre_obra_social),
               responsable:responsables (id_responsable, nombre, apellido, email, telefono)`)
            .single();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error al editar niño', error: err.message });
    }
};

// DELETE /api/ninos/:id_nino
const borrarNino = async (req, res) => {
    const { id_nino } = req.params;
    if (!id_nino) return res.status(400).json({ success: false, message: 'Falta id_nino' });
    try {
        const { error } = await supabaseAdmin.from('ninos').delete().eq('id_nino', id_nino);
        if (error) throw error;
        res.json({ success: true, message: 'Niño borrado' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error al borrar niño', error: err.message });
    }
};

module.exports = { getNinos, crearNino, editarNino, borrarNino };
