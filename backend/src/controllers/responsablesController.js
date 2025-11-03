const { supabaseAdmin } = require('../config/db');

// Buscar responsable por DNI
const buscarPorDni = async (req, res) => {
    const { dni } = req.query;
    if (!dni) return res.status(400).json({ success: false, message: 'Falta dni' });
    try {
        // If dni is purely numeric, use exact match (column is bigint in the schema),
        // otherwise fallback to ilike for partial/text searches.
        const isNumeric = /^\d+$/.test(dni);
        let query = supabaseAdmin
            .from('responsables')
            .select('id_responsable, nombre, apellido, telefono, email, dni')
            .eq('activo', true);
        if (isNumeric) {
            query = query.eq('dni', Number(dni));
        } else {
            query = query.ilike('dni', `%${dni}%`);
        }
        const { data, error } = await query;
        if (error) throw error;
        return res.json({ success: true, data });
    } catch (err) {
        console.error('buscarPorDni failed:', err);
        return res.status(500).json({ success: false, message: 'Error al buscar responsable', error: err.message });
    }
};

// Listar responsables (con búsqueda y paginación)
const listarResponsables = async (req, res) => {
    try {
        const { search = '', page = 1, pageSize = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(pageSize);
        const searchSafe = String(search || '').replace(/[%']/g, '').trim();

        let q = supabaseAdmin
            .from('responsables')
            .select('id_responsable, nombre, apellido, telefono, email, dni', { count: 'exact' })
            .eq('activo', true)
            .order('nombre', { ascending: true })
            .range(offset, offset + parseInt(pageSize) - 1);

        if (searchSafe) {
            const pattern = `%${searchSafe}%`;
            const isNumeric = /^\d+$/.test(searchSafe);
            const parts = [
                `nombre.ilike.${pattern}`,
                `apellido.ilike.${pattern}`,
                `email.ilike.${pattern}`,
                `telefono.ilike.${pattern}`,
            ];
            if (isNumeric) {
                parts.push(`dni.eq.${Number(searchSafe)}`);
            }
            q = q.or(parts.join(','));
        }

        const { data, error, count } = await q;
        if (error) throw error;
        return res.json({ success: true, data: data || [], total: count || 0 });
    } catch (err) {
        console.error('listarResponsables failed:', err);
        return res.status(500).json({ success: false, message: 'Error al listar responsables', error: err.message });
    }
};

// Crear responsable
const crearResponsable = async (req, res) => {
    const { nombre, apellido, telefono, email, dni } = req.body || {};
    if (!nombre || !apellido) {
        return res.status(400).json({ success: false, message: 'Nombre y apellido son obligatorios' });
    }

    try {
        let dniNumber = null;
        if (dni !== undefined && dni !== null && String(dni).trim() !== '') {
            if (!/^\d+$/.test(String(dni).trim())) {
                return res.status(400).json({ success: false, message: 'DNI inválido. Solo números' });
            }
            dniNumber = Number(dni);

            const { data: existing, error: existingErr } = await supabaseAdmin
                .from('responsables')
                .select('id_responsable, activo')
                .eq('dni', dniNumber)
                .maybeSingle();
            if (existingErr && existingErr.code !== 'PGRST116') throw existingErr;
            if (existing && existing.activo !== false) {
                return res.status(409).json({ success: false, message: 'Ya existe un responsable con ese DNI' });
            }
        }

        const payload = {
            nombre,
            apellido,
            telefono: telefono || null,
            email: email || null,
            dni: dniNumber,
            activo: true,
        };

        const { data, error } = await supabaseAdmin
            .from('responsables')
            .insert([payload])
            .select('id_responsable, nombre, apellido, telefono, email, dni')
            .maybeSingle();
        if (error) throw error;

        return res.status(201).json({ success: true, data });
    } catch (err) {
        console.error('crearResponsable failed:', err);
        return res.status(500).json({ success: false, message: 'Error al crear responsable', error: err.message });
    }
};

// Actualizar responsable
const actualizarResponsable = async (req, res) => {
    const { id_responsable } = req.params;
    if (!id_responsable) return res.status(400).json({ success: false, message: 'Falta id_responsable' });
    const { nombre, apellido, telefono, email, dni } = req.body || {};
    const update = {};
    if (typeof nombre !== 'undefined') update.nombre = nombre;
    if (typeof apellido !== 'undefined') update.apellido = apellido;
    if (typeof telefono !== 'undefined') update.telefono = telefono;
    if (typeof email !== 'undefined') update.email = email;
    if (typeof dni !== 'undefined' && dni !== null && dni !== '') update.dni = Number(dni);

    if (Object.keys(update).length === 0) {
        return res.status(400).json({ success: false, message: 'Nada para actualizar' });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('responsables')
            .update(update)
            .eq('id_responsable', id_responsable)
            .select('id_responsable, nombre, apellido, telefono, email, dni')
            .single();
        if (error) throw error;
        return res.json({ success: true, data });
    } catch (err) {
        console.error('actualizarResponsable failed:', err);
        return res.status(500).json({ success: false, message: 'Error al actualizar responsable', error: err.message });
    }
};

// Borrado lógico de responsable (activo=false)
const eliminarResponsable = async (req, res) => {
    const { id_responsable } = req.params;
    if (!id_responsable) return res.status(400).json({ success: false, message: 'Falta id_responsable' });
    try {
        const { error } = await supabaseAdmin
            .from('responsables')
            .update({ activo: false })
            .eq('id_responsable', id_responsable);
        if (error) throw error;
        return res.json({ success: true });
    } catch (err) {
        console.error('eliminarResponsable failed:', err);
        return res.status(500).json({ success: false, message: 'Error al eliminar responsable', error: err.message });
    }
};
// Listar niños de un responsable con relación (parentesco, es_principal)
const listarNinosDeResponsable = async (req, res) => {
    const { id_responsable } = req.params;
    if (!id_responsable) return res.status(400).json({ success: false, message: 'Falta id_responsable' });
    try {
        const { data, error } = await supabaseAdmin
            .from('nino_responsables')
            .select(`id_nino_responsable, parentesco, es_principal, nino:ninos (id_nino, nombre, apellido, dni, fecha_nacimiento, tipo)`)
            .eq('id_responsable', Number(id_responsable))
            .order('es_principal', { ascending: false });
        if (error) throw error;
        return res.json({ success: true, data: data || [] });
    } catch (err) {
        console.error('listarNinosDeResponsable failed:', err);
        return res.status(500).json({ success: false, message: 'Error al listar niños del responsable', error: err.message });
    }
};

module.exports = {
    buscarPorDni,
    listarResponsables,
    crearResponsable,
    actualizarResponsable,
    eliminarResponsable,
    listarNinosDeResponsable,
};
