const { supabaseAdmin } = require('../config/db');

const listProfesiones = async (_req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('profesiones')
            .select('id_departamento, nombre, descripcion, duracion_default_min, responsable_id')
            .order('nombre', { ascending: true });
        if (error) throw error;
        return res.json({ success: true, data: data || [] });
    } catch (err) {
        console.error('listProfesiones error:', err);
        return res.status(500).json({ success: false, message: 'Error al obtener profesiones', error: err.message });
    }
};

module.exports = { listProfesiones };
