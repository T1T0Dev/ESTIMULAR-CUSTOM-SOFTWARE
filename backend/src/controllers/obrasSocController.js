const { supabaseAdmin } = require('../config/db');

// GET /api/obras-sociales
// Params: search, page=1, pageSize=10, estado (opcional, 'todos' para ignorar)
async function listarObrasSociales(req, res) {
  try {
    const { search = '', page = 1, pageSize = 10, estado } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const size = Math.max(parseInt(pageSize, 10) || 10, 1);
    const from = (pageNum - 1) * size;
    const to = from + size - 1;

    let query = supabaseAdmin
      .from('obras_sociales')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.ilike('nombre_obra_social', `%${search}%`);
    }
    if (estado && estado !== 'todos') {
      query = query.eq('estado', estado);
    }

    query = query.order('nombre_obra_social', { ascending: true }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return res.json({ success: true, data: data || [], total: count || 0 });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Error al listar obras sociales' });
  }
}

// GET /api/obras-sociales/estados
async function listarEstadosObraSocial(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('obras_sociales')
      .select('estado');
    if (error) throw error;
    const estados = Array.from(new Set((data || []).map((r) => r.estado).filter(Boolean)));
    return res.json({ success: true, data: estados });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Error al listar estados' });
  }
}

// POST /api/obras-sociales
async function crearObraSocial(req, res) {
  try {
    const { nombre_obra_social, estado } = req.body || {};
    if (!nombre_obra_social || !String(nombre_obra_social).trim()) {
      return res.status(400).json({ success: false, message: 'El nombre de la obra social es obligatorio' });
    }
    const insertPayload = {
      nombre_obra_social: String(nombre_obra_social).trim(),
    };
    if (estado) insertPayload.estado = estado;

    const { data, error } = await supabaseAdmin
      .from('obras_sociales')
      .insert([insertPayload])
      .select('*')
      .single();
    if (error) throw error;

    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Error al crear la obra social' });
  }
}

// PUT /api/obras-sociales/:id
async function editarObraSocial(req, res) {
  try {
    const { id } = req.params;
    const { nombre_obra_social, estado } = req.body || {};
    const payload = {};
    if (nombre_obra_social !== undefined) payload.nombre_obra_social = String(nombre_obra_social).trim();
    if (estado !== undefined) payload.estado = estado;
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ success: false, message: 'Nada para actualizar' });
    }
    const { data, error } = await supabaseAdmin
      .from('obras_sociales')
      .update(payload)
      .eq('id_obra_social', id)
      .select('*')
      .single();
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Error al editar la obra social' });
  }
}

// DELETE /api/obras-sociales/:id
async function borrarObraSocial(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from('obras_sociales')
      .delete()
      .eq('id_obra_social', id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Error al borrar la obra social' });
  }
}

module.exports = {
  listarObrasSociales,
  listarEstadosObraSocial,
  crearObraSocial,
  editarObraSocial,
  borrarObraSocial,
};
