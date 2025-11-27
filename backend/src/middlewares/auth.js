const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../config/db');

// Import normalizeTipo from loginController
function normalizeText(text) {
  if (text === undefined || text === null) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeTipo(value) {
  const normalized = normalizeText(value);
  if (!normalized) return '';
  if (
    normalized.startsWith('recepcion') ||
    normalized.startsWith('secretar') ||
    normalized === 'recepcionista' ||
    normalized === 'recepcionist'
  ) {
    return 'recepcion';
  }
  if (normalized === 'professional') return 'profesional';
  return normalized;
}

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET || 'dev_secret_change_me';

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded; // { id, dni }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const authorize = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      // Fetch user roles from database
      const { data: rolesData, error } = await supabaseAdmin
        .from('usuario_roles')
        .select('rol:roles(nombre_rol)')
        .eq('usuario_id', req.user.id);

      if (error) {
        console.error('Error fetching roles:', error);
        return res.status(500).json({ error: 'Error interno' });
      }

      const userRoles = (rolesData || []).map(row => normalizeTipo(row.rol?.nombre_rol)).filter(Boolean);

      // Check if user has any of the allowed roles
      const hasAccess = allowedRoles.some(role => userRoles.includes(role));

      if (!hasAccess) {
        return res.status(403).json({ error: 'Acceso denegado' });
      }

      req.user.roles = userRoles; // Attach roles to req.user for later use
      next();
    } catch (err) {
      console.error('Authorization error:', err);
      return res.status(500).json({ error: 'Error interno' });
    }
  };
};

module.exports = { authenticate, authorize };