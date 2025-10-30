const supabase = require('../config/db');
const { formatNinoDetails } = require('../utils/ninoFormatter');

function sanitizeSearchTerm(term) {
  return term.replace(/[%]/g, '').trim();
}

async function searchNinos(search = '', limit = 10) {
  const normalizedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 25);
  let query = supabase
    .from('ninos')
    .select(`
      id_nino,
      nombre,
      apellido,
      dni,
      fecha_nacimiento,
      certificado_discapacidad,
      tipo,
      activo,
      foto_perfil,
      id_obra_social,
      obra_social:obras_sociales!ninos_id_obra_social_fkey (
        id_obra_social,
        nombre_obra_social,
        estado
      ),
      responsables:nino_responsables (
        parentesco,
        es_principal,
        responsable:responsables!nino_responsables_id_responsable_fkey (
          id_responsable,
          nombre,
          apellido,
          telefono,
          email
        )
      )
    `)
    .limit(normalizedLimit)
    .order('nombre', { ascending: true });

  const trimmed = sanitizeSearchTerm(search);
  if (trimmed) {
    const ilikeValue = `%${trimmed}%`;
    query = query.or(
      `nombre.ilike.${ilikeValue},apellido.ilike.${ilikeValue},dni.ilike.${ilikeValue}`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((nino) => formatNinoDetails(nino));
}

async function getNinoById(id) {
  const ninoId = parseInt(id, 10);
  if (Number.isNaN(ninoId)) return null;

  const { data, error } = await supabase
    .from('ninos')
    .select(`
      id_nino,
      nombre,
      apellido,
      dni,
      fecha_nacimiento,
      certificado_discapacidad,
      tipo,
      activo,
      foto_perfil,
      id_obra_social,
      obra_social:obras_sociales!ninos_id_obra_social_fkey (
        id_obra_social,
        nombre_obra_social,
        estado
      ),
      responsables:nino_responsables (
        parentesco,
        es_principal,
        responsable:responsables!nino_responsables_id_responsable_fkey (
          id_responsable,
          nombre,
          apellido,
          telefono,
          email
        )
      )
    `)
    .eq('id_nino', ninoId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  if (!data) return null;
  return formatNinoDetails(data);
}

module.exports = {
  searchNinos,
  getNinoById,
};
