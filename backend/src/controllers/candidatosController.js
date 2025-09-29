const { supabase } = require('../config/db');

// Obtener candidatos con búsqueda y paginación
const getCandidatos = async (req, res) => {
  const { search = '', page = 1, pageSize = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  try {
    let query = supabase
      .from('candidatos')
      .select(`*, responsables: candidato_responsables (parentesco, es_principal, responsable: responsables (*)), obra_social: obras_sociales (nombre), estado_entrevista`)
      .order('created_at', { ascending: false });

    if (search) {
      // Buscar por nombre, apellido o DNI
      query = query.or(`nombre_nino.ilike.%${search}%,apellido_nino.ilike.%${search}%,dni_nino.ilike.%${search}%`);
    }

    query = query.range(offset, offset + parseInt(pageSize) - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    // Obtener total de candidatos para paginación
    const { count: totalCount, error: countError } = await supabase
      .from('candidatos')
      .select('id_candidato', { count: 'exact', head: true });
    if (countError) throw countError;

    res.json({ success: true, data, total: totalCount });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al obtener candidatos', error: err.message });
  }
};

// Cambiar estado de entrevista
const cambiarEstado = async (req, res) => {
  const { id_candidato } = req.params;
  const { estado_entrevista } = req.body;
  if (!id_candidato || !estado_entrevista) {
    return res.status(400).json({ success: false, message: 'Faltan datos' });
  }
  try {
    const { data, error } = await supabase
      .from('candidatos')
      .update({ estado_entrevista })
      .eq('id_candidato', id_candidato)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al cambiar estado', error: err.message });
  }
};

// Editar candidato
const editarCandidato = async (req, res) => {
  const { id_candidato } = req.params;
  const updateData = req.body;
  if (!id_candidato || !updateData || Object.keys(updateData).length === 0) {
    return res.status(400).json({ success: false, message: 'Faltan datos para editar' });
  }
  try {
    const { data, error } = await supabase
      .from('candidatos')
      .update(updateData)
      .eq('id_candidato', id_candidato)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al editar candidato', error: err.message });
  }
};

// Borrar candidato
const borrarCandidato = async (req, res) => {
  const { id_candidato } = req.params;
  if (!id_candidato) {
    return res.status(400).json({ success: false, message: 'Falta id_candidato' });
  }
  try {
    const { error } = await supabase
      .from('candidatos')
      .delete()
      .eq('id_candidato', id_candidato);
    if (error) throw error;
    res.json({ success: true, message: 'Candidato borrado' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al borrar candidato', error: err.message });
  }
};

module.exports = { getCandidatos, cambiarEstado, editarCandidato, borrarCandidato };
