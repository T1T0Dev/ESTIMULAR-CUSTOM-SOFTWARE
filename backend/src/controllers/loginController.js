const { supabaseAdmin } = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {
  resolveStorageAsset,
  deleteStorageAsset,
  uploadProfileImageIfNeeded,
  isHttpUrl,
} = require('../utils/storage');
const { upsertWithIdentityOverride } = require('../utils/upsertWithIdentityOverride');

const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD_LOGIN || 'estimular_2025';

function isValidDni(dni) {
  if (dni === undefined || dni === null) return false;
  return /^\d{7,15}$/.test(String(dni).trim());
}

function isSafePassword(pwd) {
  const forbidden = [/('|--|;|\/\*|\*\/|xp_|exec|union|select|insert|delete|update|drop|alter|create|shutdown)/i];
  return typeof pwd === 'string' && pwd.length >= 8 && !forbidden.some((regex) => regex.test(pwd));
}

function isValidDateYYYYMMDD(value) {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

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

function isRecepcionTipo(value) {
  return normalizeTipo(value) === 'recepcion';
}

function mapRoleDisplayName(rawName) {
  const normalized = normalizeText(rawName);
  if (!normalized) return rawName || null;
  if (normalized.includes('admin')) {
    return 'Admin';
  }
  if (
    normalized === 'recepcion' ||
    normalized === 'recepcionista' ||
    normalized === 'recepcionist' ||
    normalized === 'secretario' ||
    normalized === 'secretaria'
  ) {
    return 'Recepción';
  }
  return rawName;
}

function rolePriority(normalizedName) {
  if (!normalizedName) return 50;
  if (normalizedName.includes('admin')) return 0;
  if (normalizedName.includes('recepcion') || normalizedName.includes('secretar')) return 1;
  if (normalizedName.includes('profes')) return 2;
  return 5;
}

function hasAdminRole(roles = []) {
  return roles.some((role) => {
    const rawName = role?.nombre || role?.rolNombre || role?.rol || role?.nombre_rol;
    const normalized = normalizeText(rawName);
    return normalized.includes('admin');
  });
}

function determineTipoFromRoles(roles = [], hasProfession = false) {
  const names = (roles || [])
    .map((role) => normalizeText(role?.nombre || role?.rolNombre || role?.rol))
    .filter(Boolean);

  if (names.some((name) => name.startsWith('recepcion') || name.startsWith('secretar'))) {
    return 'recepcion';
  }
  if (hasProfession) return 'profesional';
  return 'profesional';
}

function normalizePhoneValue(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function normalizeEmailValue(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed.toLowerCase();
}

function extractToken(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

function cleanObject(source) {
  if (!source) return {};
  return Object.fromEntries(Object.entries(source).filter(([, value]) => value !== undefined));
}

async function fetchUserRoles(idUsuario) {
  if (!idUsuario) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from('usuario_roles')
      .select(`
        usuario_id,
        rol_id,
        rol:roles ( id_rol, nombre_rol )
      `)
      .eq('usuario_id', Number(idUsuario));
    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('fetchUserRoles error:', error);
      }
      return [];
    }
    const roles = (data || [])
      .map((row) => {
        const rawName = row.rol?.nombre_rol ?? null;
        const normalized = normalizeText(rawName);
        return {
          id: row.rol_id ?? row.rol?.id_rol ?? null,
          nombre: mapRoleDisplayName(rawName),
          _normalized: normalized,
        };
      })
      .filter((rol) => rol.id || rol.nombre);

    roles.sort((a, b) => {
      const priorityDiff = rolePriority(a._normalized) - rolePriority(b._normalized);
      if (priorityDiff !== 0) return priorityDiff;
      return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es');
    });

    return roles.map(({ _normalized, ...rest }) => rest);
  } catch (err) {
    console.error('fetchUserRoles exception:', err);
    return [];
  }
}

async function assignRoleToUser(usuarioId, rolId) {
  if (!usuarioId || !rolId) return;
  try {
    const { error } = await supabaseAdmin
      .from('usuario_roles')
      .upsert(
        [{ usuario_id: Number(usuarioId), rol_id: Number(rolId) }],
        { onConflict: 'usuario_id,rol_id' }
      );

    if (error) {
      if (error.code === '23505') return;
      const fallback = await supabaseAdmin
        .from('usuario_roles')
        .insert([{ usuario_id: Number(usuarioId), rol_id: Number(rolId) }]);
      if (fallback.error && fallback.error.code !== '23505') {
        console.error('assignRoleToUser insert error:', fallback.error);
      }
    }
  } catch (err) {
    console.error('assignRoleToUser exception:', err);
  }
}

async function fetchRoleIdForTipo(tipo) {
  const normalized = normalizeTipo(tipo);
  if (!normalized) return null;

  const candidates = normalized === 'profesional'
    ? ['profesional', 'professional']
    : ['recepcion', 'recepcionista', 'recepcionist', 'secretario', 'secretaria', 'secretario/a', 'secretaria/o'];

  try {
    const { data, error } = await supabaseAdmin.from('roles').select('id_rol, nombre_rol');
    if (error) {
      console.error('fetchRoleIdForTipo error:', error);
      return null;
    }
    for (const row of data || []) {
      const roleName = normalizeText(row?.nombre_rol);
      if (roleName && candidates.some((candidate) => roleName === candidate || roleName.includes(candidate))) {
        return Number(row.id_rol);
      }
    }
  } catch (err) {
    console.error('fetchRoleIdForTipo exception:', err);
  }
  return null;
}

async function fetchUserAndPersona(idUsuario) {
  try {
    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .select(`
        id_usuario,
        dni,
        activo,
        persona_id,
        persona:personas (
          id,
          nombre,
          apellido,
          telefono,
          email,
          fecha_nacimiento,
          foto_perfil
        )
      `)
      .eq('id_usuario', Number(idUsuario))
      .maybeSingle();
    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('fetchUserAndPersona error:', error);
      }
      return null;
    }
    if (!data) return null;
    const persona = data.persona || null;
    const personaId = data.persona_id || persona?.id || null;
    return {
      user: {
        id_usuario: data.id_usuario,
        dni: data.dni,
        activo: data.activo,
        persona_id: personaId,
      },
      persona,
      personaId,
    };
  } catch (err) {
    console.error('fetchUserAndPersona exception:', err);
    return null;
  }
}

async function fetchPersonaProfesion(personaId) {
  if (!personaId) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from('profesional_departamentos')
      .select(`
        profesional_id,
        departamento_id,
        departamento:profesiones ( id_departamento, nombre )
      `)
      .eq('profesional_id', Number(personaId))
      .limit(1)
      .maybeSingle();
    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('fetchPersonaProfesion error:', error);
      }
      return null;
    }
    if (!data) return null;
    return {
      id_departamento: data.departamento_id ?? data.departamento?.id_departamento ?? null,
      nombre: data.departamento?.nombre ?? null,
    };
  } catch (err) {
    console.error('fetchPersonaProfesion exception:', err);
    return null;
  }
}

async function fetchUserProfile(idUsuario, rolesHint = null, prefetchedSnapshot = null) {
  const snapshot = prefetchedSnapshot || (await fetchUserAndPersona(idUsuario));
  if (!snapshot) return null;

  const { user, persona, personaId } = snapshot;
  if (!personaId || !persona) return null;

  const roles = rolesHint || (await fetchUserRoles(idUsuario));
  const profesion = await fetchPersonaProfesion(personaId);
  const foto = await resolveStorageAsset(persona.foto_perfil);
  const tipo = determineTipoFromRoles(roles, !!profesion?.id_departamento);
  const esAdmin = hasAdminRole(roles);

  return {
    tipo,
    es_admin: esAdmin,
    id_usuario: user.id_usuario,
    persona_id: personaId,
    nombre: persona.nombre ?? null,
    apellido: persona.apellido ?? null,
    telefono: persona.telefono ?? null,
    email: persona.email ?? null,
    fecha_nacimiento: persona.fecha_nacimiento ?? null,
    foto_perfil: foto.signedUrl || persona.foto_perfil || null,
    foto_perfil_url: foto.signedUrl || null,
    foto_perfil_path: foto.path,
    profesion: profesion?.nombre ?? (tipo === 'recepcion' ? 'Recepción' : null),
    profesion_id: profesion?.id_departamento ?? null,
  };
}

function computeNeedsProfile(perfil) {
  if (!perfil) return true;
  const required = [perfil.nombre, perfil.apellido, perfil.telefono, perfil.email, perfil.fecha_nacimiento];
  if (required.some((value) => value === null || value === undefined || String(value).trim() === '')) {
    return true;
  }
  if (perfil.tipo === 'profesional' && !perfil.profesion_id) return true;
  return false;
}

async function processProfilePhoto(usuarioId, fotoValue, previousPath, { allowHttpFallback = true } = {}) {
  if (fotoValue === undefined) return previousPath || null;
  if (fotoValue === null) {
    await deleteStorageAsset(previousPath);
    return null;
  }
  if (typeof fotoValue === 'string' && fotoValue.trim() === '') {
    await deleteStorageAsset(previousPath);
    return null;
  }
  if (typeof fotoValue === 'string' && fotoValue.startsWith('data:image')) {
    const uploadResult = await uploadProfileImageIfNeeded(usuarioId, fotoValue, { previousPath });
    return uploadResult?.path || previousPath || null;
  }
  if (typeof fotoValue === 'string') {
    const trimmed = fotoValue.trim();
    if (allowHttpFallback && isHttpUrl(trimmed)) {
      if (previousPath && previousPath !== trimmed) {
        await deleteStorageAsset(previousPath);
      }
      return trimmed;
    }
    if (previousPath && previousPath !== trimmed) {
      await deleteStorageAsset(previousPath);
    }
    return trimmed || null;
  }
  return previousPath || null;
}

async function savePersonaForUser(usuarioId, personaId, payload) {
  const cleaned = cleanObject(payload);
  if (personaId) {
    const { error } = await supabaseAdmin
      .from('personas')
      .update(cleaned)
      .eq('id', Number(personaId));
    if (error) throw error;
    return personaId;
  }
  if (!cleaned.nombre || !cleaned.apellido) {
    const err = new Error('Se requieren nombre y apellido para crear la persona');
    err.status = 400;
    throw err;
  }
  const { data, error } = await supabaseAdmin
    .from('personas')
    .insert([cleaned])
    .select('id')
    .maybeSingle();
  if (error) throw error;
  const newPersonaId = data?.id;
  if (!newPersonaId) {
    throw new Error('No se pudo crear la persona');
  }
  const { error: linkErr } = await supabaseAdmin
    .from('usuarios')
    .update({ persona_id: newPersonaId })
    .eq('id_usuario', Number(usuarioId));
  if (linkErr) throw linkErr;
  return newPersonaId;
}

async function setPersonaProfession(personaId, profesionId) {
  if (!personaId) return;
  try {
    const { error: delErr } = await supabaseAdmin
      .from('profesional_departamentos')
      .delete()
      .eq('profesional_id', Number(personaId));
    if (delErr && delErr.code !== 'PGRST116') {
      console.warn('setPersonaProfession delete warn:', delErr);
    }
  } catch (err) {
    console.warn('setPersonaProfession delete exception:', err);
  }
  if (profesionId === undefined || profesionId === null) return;
  try {
    const { error: insErr } = await supabaseAdmin
      .from('profesional_departamentos')
      .upsert(
        [{ profesional_id: Number(personaId), departamento_id: Number(profesionId) }],
        { onConflict: 'profesional_id,departamento_id' }
      );
    if (insErr && insErr.code !== '23505') {
      console.warn('setPersonaProfession insert warn:', insErr);
    }
  } catch (err) {
    console.error('setPersonaProfession insert exception:', err);
  }
}

async function syncLegacySecretarioRecord(usuarioId, payload = {}) {
  const numericUserId = Number(usuarioId);
  if (!Number.isInteger(numericUserId) || numericUserId <= 0) return;

  const basePayload = {
    nombre: payload.nombre ?? null,
    apellido: payload.apellido ?? null,
    telefono: payload.telefono ?? null,
    email: payload.email ?? null,
    fecha_nacimiento: payload.fecha_nacimiento ?? null,
    foto_perfil: payload.foto_perfil ?? null,
  };

  const attemptUpsert = async (record, onConflict) => {
    try {
      const { error } = await supabaseAdmin
        .from('secretarios')
        .upsert([record], { onConflict, ignoreDuplicates: false });
      return error || null;
    } catch (err) {
      return err;
    }
  };

  let error = await attemptUpsert({ ...basePayload, usuario_id: numericUserId }, 'usuario_id');

  const missingUsuarioIdCodes = new Set(['42703', 'PGRST204']);
  if (error && (error.code === 'PGRST205' || /secretarios/i.test(error?.message || ''))) {
    console.warn('syncLegacySecretarioRecord: tabla secretarios ausente en la caché de esquema. Saltando sincronización.');
    return;
  }

  if (error && (missingUsuarioIdCodes.has(error.code) || /column "?usuario_id"?/i.test(error.message || ''))) {
    error = await attemptUpsert({ ...basePayload, id: numericUserId }, 'id');
  }

  if (error && error.code === '428C9') {
    try {
      await upsertWithIdentityOverride(
        'secretarios',
        { id: numericUserId, ...basePayload },
        { onConflict: 'id' }
      );
      error = null;
    } catch (overrideErr) {
      error = overrideErr;
    }
  }

  if (error && (error.code === '42P01' || error.code === 'PGRST205')) {
    console.warn('syncLegacySecretarioRecord: tabla secretarios inexistente. Se omite sincronización.');
    return;
  }

  if (error) {
    throw error;
  }
}

async function resolveRoleIdMaybe(body) {
  if (!body) return null;
  const idCandidate = body.id_rol ?? body.rol_id;
  if (idCandidate !== undefined && idCandidate !== null && !Number.isNaN(Number(idCandidate))) {
    return Number(idCandidate);
  }
  if (!body.rolNombre) return null;
  const roleName = String(body.rolNombre).trim();
  if (!roleName) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from('roles')
      .select('id_rol, nombre_rol')
      .eq('nombre_rol', roleName)
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('resolveRoleIdMaybe roles error:', error);
      return null;
    }
    return data ? Number(data.id_rol) : null;
  } catch (err) {
    console.error('resolveRoleIdMaybe exception:', err);
    return null;
  }
}

const registrarUsuario = async (req, res) => {
  try {
    const { dni, contrasena } = req.body || {};
    const roleId = await resolveRoleIdMaybe(req.body);

    if (!isValidDni(dni)) {
      return res.status(400).json({ error: 'DNI inválido. Debe tener entre 7 y 15 números.' });
    }
    if (!isSafePassword(contrasena)) {
      return res.status(400).json({ error: 'Contraseña insegura o inválida.' });
    }
    if (roleId === null) {
      return res.status(400).json({ error: 'id_rol/rolNombre es obligatorio' });
    }

    const { data: existingUser, error: findErr } = await supabaseAdmin
      .from('usuarios')
      .select('id_usuario')
      .eq('dni', Number(dni))
      .maybeSingle();
    if (findErr) {
      console.error('registrarUsuario existing user error:', findErr);
      return res.status(500).json({ error: 'No se pudo verificar el usuario existente' });
    }
    if (existingUser) {
      return res.status(409).json({ error: 'El usuario ya existe' });
    }

    const hash = await bcrypt.hash(String(contrasena), 12);

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('usuarios')
      .insert([{ dni: Number(dni), password_hash: hash, activo: true }])
      .select('id_usuario, dni, activo')
      .maybeSingle();

    if (insertErr) {
      console.error('registrarUsuario insert error:', insertErr);
      return res.status(500).json({ error: 'No se pudo registrar el usuario' });
    }

    await assignRoleToUser(inserted.id_usuario, roleId);

    return res.status(201).json({
      message: 'Usuario registrado con éxito',
      user: { ...inserted, id_rol: roleId, es_admin: false },
    });
  } catch (err) {
    console.error('registrarUsuario exception:', err);
    return res.status(500).json({ error: err.message || 'Error al registrar usuario' });
  }
};

const loginUsuario = async (req, res) => {
  try {
    const { dni, contrasena } = req.body || {};
    if (!dni || !contrasena) {
      return res.status(400).json({ error: 'Faltan credenciales' });
    }

    const { data: user, error: findErr } = await supabaseAdmin
      .from('usuarios')
      .select('id_usuario, dni, password_hash, activo')
      .eq('dni', Number(dni))
      .maybeSingle();

    if (findErr) {
      console.error('loginUsuario lookup error:', findErr);
      return res.status(500).json({ error: 'Error interno' });
    }
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (user.activo === false) {
      return res.status(403).json({ error: 'Usuario inactivo' });
    }

    let credentialsValid = false;
    if (!user.password_hash) {
      if (String(contrasena) === DEFAULT_PASSWORD) {
        const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
        const { error: initErr } = await supabaseAdmin
          .from('usuarios')
          .update({ password_hash: hash })
          .eq('id_usuario', user.id_usuario);
        if (initErr) {
          console.error('loginUsuario default password hash error:', initErr);
          return res.status(500).json({ error: 'No se pudo validar credenciales' });
        }
        credentialsValid = true;
      }
    } else {
      credentialsValid = await bcrypt.compare(String(contrasena), user.password_hash || '');
    }

    if (!credentialsValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    const token = jwt.sign({ id: user.id_usuario, dni: user.dni }, secret, { expiresIn: '8h' });

    const roles = await fetchUserRoles(user.id_usuario);
    const perfil = await fetchUserProfile(user.id_usuario, roles);
    const esAdmin = hasAdminRole(roles);
    const needsProfile = computeNeedsProfile(perfil);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id_usuario,
        dni: user.dni,
        id_rol: roles[0]?.id ?? null,
        rol_nombre: roles[0]?.nombre ?? null,
        roles,
        es_admin: esAdmin,
      },
      profile: perfil,
      firstLogin: String(contrasena) === DEFAULT_PASSWORD,
      needsProfile,
    });
  } catch (err) {
    console.error('loginUsuario exception:', err);
    return res.status(500).json({ error: err.message || 'Error al iniciar sesión' });
  }
};

const primerRegistro = async (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Token requerido' });
    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch (err) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const userId = payload.id;
    const snapshot = await fetchUserAndPersona(userId);
    if (!snapshot) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const {
      nombre,
      apellido,
      telefono,
      fecha_nacimiento,
      email,
      seleccion,
      tipoUsuario,
      profesionId,
      foto_perfil,
      nuevaContrasena,
    } = req.body || {};

    if (!nombre || !apellido || !telefono || !fecha_nacimiento || !email || !nuevaContrasena) {
      return res.status(400).json({
        error: 'Faltan datos obligatorios (nombre, apellido, telefono, email, fecha_nacimiento, nuevaContrasena)',
      });
    }

    const fechaStr = String(fecha_nacimiento);
    if (!isValidDateYYYYMMDD(fechaStr)) {
      return res.status(400).json({ error: 'fecha_nacimiento debe tener formato YYYY-MM-DD' });
    }

    if (!isSafePassword(nuevaContrasena)) {
      return res.status(400).json({ error: 'La nueva contraseña es insegura o inválida' });
    }
    if (String(nuevaContrasena) === DEFAULT_PASSWORD) {
      return res.status(400).json({ error: 'Elegí una contraseña distinta a la genérica' });
    }

    let resolvedTipo = null;
    let resolvedProfesionId = null;

    if (typeof seleccion === 'string' && seleccion.trim()) {
      if (isRecepcionTipo(seleccion)) {
        resolvedTipo = 'recepcion';
      } else if (!Number.isNaN(Number(seleccion))) {
        resolvedTipo = 'profesional';
        resolvedProfesionId = Number(seleccion);
      }
    }

    if (!resolvedTipo && typeof tipoUsuario === 'string' && tipoUsuario.trim()) {
      const normalized = normalizeTipo(tipoUsuario);
      if (normalized === 'profesional' || normalized === 'recepcion') {
        resolvedTipo = normalized;
      }
    }

    if (resolvedProfesionId === null && profesionId !== undefined && profesionId !== null && !Number.isNaN(Number(profesionId))) {
      resolvedProfesionId = Number(profesionId);
    }

    if (!resolvedTipo) {
      resolvedTipo = resolvedProfesionId ? 'profesional' : 'recepcion';
    }

    if (resolvedTipo === 'profesional' && !resolvedProfesionId) {
      return res.status(400).json({ error: 'Seleccioná una profesión válida' });
    }

    const currentProfile = await fetchUserProfile(userId, null, snapshot);
    if (currentProfile && !computeNeedsProfile(currentProfile)) {
      return res.status(409).json({ error: 'El perfil ya fue completado' });
    }

    const previousPath = snapshot.persona?.foto_perfil || null;
    const fotoPath = await processProfilePhoto(userId, foto_perfil, previousPath);

    const personaPayload = {
      nombre: String(nombre).trim(),
      apellido: String(apellido).trim(),
      telefono: normalizePhoneValue(telefono),
      email: normalizeEmailValue(email),
      fecha_nacimiento: fechaStr,
      foto_perfil: fotoPath,
    };

    const personaId = await savePersonaForUser(userId, snapshot.personaId, personaPayload);

    if (resolvedTipo === 'profesional') {
      await setPersonaProfession(personaId, resolvedProfesionId);
    } else {
      await setPersonaProfession(personaId, null);
      try {
        await syncLegacySecretarioRecord(userId, {
          nombre: String(nombre).trim(),
          apellido: String(apellido).trim(),
          telefono: normalizePhoneValue(telefono),
          email: normalizeEmailValue(email),
          fecha_nacimiento: fechaStr,
          foto_perfil: fotoPath,
        });
      } catch (secretarioErr) {
        console.error('primerRegistro sync secretaria error:', secretarioErr);
        return res.status(500).json({ error: 'No se pudo actualizar el perfil de recepción' });
      }
    }

    const passwordHash = await bcrypt.hash(String(nuevaContrasena), 12);
    const { error: pwdErr } = await supabaseAdmin
      .from('usuarios')
      .update({ password_hash: passwordHash })
      .eq('id_usuario', Number(userId));
    if (pwdErr) {
      console.error('primerRegistro update password error:', pwdErr);
      return res.status(500).json({ error: 'No se pudo actualizar la contraseña' });
    }

    const roleId = await fetchRoleIdForTipo(resolvedTipo);
    if (roleId) {
      await assignRoleToUser(userId, roleId);
    }

    const profile = await fetchUserProfile(userId);
    return res.json({ success: true, profile });
  } catch (err) {
    console.error('primerRegistro exception:', err);
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || 'Error en el primer registro' });
  }
};

const actualizarPerfil = async (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Token requerido' });

    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch (err) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const userId = payload.id;
    const snapshot = await fetchUserAndPersona(userId);
    if (!snapshot) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const {
      nombre,
      apellido,
      telefono,
      fecha_nacimiento,
      email,
      profesionId,
      tipoUsuario,
      foto_perfil,
      removeFoto,
      dni,
      nuevaContrasena,
    } = req.body || {};

    let userUpdate = {};
    if (dni !== undefined) {
      const dniStr = String(dni).trim();
      if (!isValidDni(dniStr)) {
        return res.status(400).json({ error: 'DNI inválido. Debe tener entre 7 y 15 números.' });
      }
      const dniNum = Number(dniStr);
      const { data: conflict, error: dniErr } = await supabaseAdmin
        .from('usuarios')
        .select('id_usuario')
        .eq('dni', dniNum)
        .neq('id_usuario', Number(userId))
        .maybeSingle();
      if (dniErr && dniErr.code !== 'PGRST116') {
        console.error('actualizarPerfil DNI lookup error:', dniErr);
        return res.status(500).json({ error: 'No se pudo validar el DNI' });
      }
      if (conflict) {
        return res.status(409).json({ error: 'El DNI ingresado ya está en uso' });
      }
      userUpdate.dni = dniNum;
    }

    if (nuevaContrasena) {
      if (!isSafePassword(nuevaContrasena)) {
        return res.status(400).json({ error: 'Contraseña inválida o insegura' });
      }
      if (String(nuevaContrasena) === DEFAULT_PASSWORD) {
        return res.status(400).json({ error: 'Elegí una contraseña distinta a la genérica' });
      }
      userUpdate.password_hash = await bcrypt.hash(String(nuevaContrasena), 12);
    }

    if (Object.keys(userUpdate).length > 0) {
      const { error: updErr } = await supabaseAdmin
        .from('usuarios')
        .update(userUpdate)
        .eq('id_usuario', Number(userId));
      if (updErr) {
        console.error('actualizarPerfil usuarios update error:', updErr);
        return res.status(500).json({ error: 'No se pudieron actualizar las credenciales' });
      }
    }

    const currentProfile = await fetchUserProfile(userId, null, snapshot);
    const currentTipo = normalizeTipo(currentProfile?.tipo);

    let resolvedTipo = currentTipo || 'profesional';
    if (typeof tipoUsuario === 'string' && tipoUsuario.trim()) {
      const normalized = normalizeTipo(tipoUsuario);
      if (normalized === 'profesional' || normalized === 'recepcion') {
        resolvedTipo = normalized;
      }
    } else if (!currentTipo && (profesionId !== undefined && profesionId !== null && profesionId !== '')) {
      resolvedTipo = 'profesional';
    }

    if (resolvedTipo !== 'profesional' && resolvedTipo !== 'recepcion') {
      resolvedTipo = 'profesional';
    }

    const previousPhotoPath = snapshot.persona?.foto_perfil || null;
    const nextPhotoPath = removeFoto === true
      ? null
      : await processProfilePhoto(userId, foto_perfil, previousPhotoPath);

    const personaPayload = {};
    if (nombre !== undefined) personaPayload.nombre = String(nombre).trim();
    if (apellido !== undefined) personaPayload.apellido = String(apellido).trim();
    if (telefono !== undefined) personaPayload.telefono = normalizePhoneValue(telefono);
    if (email !== undefined) personaPayload.email = normalizeEmailValue(email);
    if (foto_perfil !== undefined || removeFoto === true) personaPayload.foto_perfil = nextPhotoPath;

    if (fecha_nacimiento !== undefined) {
      if (!fecha_nacimiento) {
        if (resolvedTipo === 'profesional') {
          return res.status(400).json({ error: 'fecha_nacimiento es obligatorio para profesionales' });
        }
        personaPayload.fecha_nacimiento = null;
      } else {
        const fechaStr = String(fecha_nacimiento);
        if (!isValidDateYYYYMMDD(fechaStr)) {
          return res.status(400).json({ error: 'fecha_nacimiento debe tener formato YYYY-MM-DD' });
        }
        personaPayload.fecha_nacimiento = fechaStr;
      }
    }

    let personaId = snapshot.personaId;
    if (Object.keys(personaPayload).length > 0) {
      try {
        personaId = await savePersonaForUser(userId, personaId, personaPayload);
      } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ error: err.message || 'No se pudo actualizar la persona' });
      }
    }

    if (profesionId !== undefined) {
      if (!personaId) {
        return res.status(400).json({ error: 'No se puede asignar profesión sin datos personales' });
      }
      if (resolvedTipo !== 'profesional' || profesionId === null || profesionId === '') {
        await setPersonaProfession(personaId, null);
      } else {
        const parsed = Number(profesionId);
        if (Number.isNaN(parsed)) {
          return res.status(400).json({ error: 'profesionId inválido' });
        }
        await setPersonaProfession(personaId, parsed);
      }
    }

    const roles = await fetchUserRoles(userId);
    const profile = await fetchUserProfile(userId, roles);
    const esAdmin = hasAdminRole(roles);
    if (resolvedTipo === 'recepcion') {
      try {
        await syncLegacySecretarioRecord(userId, {
          nombre: profile?.nombre ?? null,
          apellido: profile?.apellido ?? null,
          telefono: profile?.telefono ?? null,
          email: profile?.email ?? null,
          fecha_nacimiento: profile?.fecha_nacimiento ?? null,
          foto_perfil: profile?.foto_perfil_path || profile?.foto_perfil || null,
        });
      } catch (secretarioErr) {
        console.error('actualizarPerfil sync recepcion error:', secretarioErr);
        return res.status(500).json({ error: 'No se pudo sincronizar el perfil de recepción' });
      }
    }
    const { data: userRow } = await supabaseAdmin
      .from('usuarios')
      .select('id_usuario, dni, activo')
      .eq('id_usuario', Number(userId))
      .maybeSingle();

    return res.json({
      success: true,
      profile,
      user: userRow
        ? {
          id: userRow.id_usuario,
          dni: userRow.dni,
          activo: userRow.activo,
          id_rol: roles[0]?.id ?? null,
          rol_nombre: roles[0]?.nombre ?? null,
          roles,
          es_admin: esAdmin,
        }
        : undefined,
    });
  } catch (err) {
    console.error('actualizarPerfil exception:', err);
    return res.status(500).json({ error: err.message || 'Error al actualizar el perfil' });
  }
};

const obtenerPerfilActual = async (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Token requerido' });

    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch (err) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const userId = payload.id;
    const { data: user, error } = await supabaseAdmin
      .from('usuarios')
      .select('id_usuario, dni, activo')
      .eq('id_usuario', Number(userId))
      .maybeSingle();

    if (error) {
      console.error('obtenerPerfilActual user error:', error);
      return res.status(500).json({ error: 'Error interno' });
    }
    if (!user || user.activo === false) {
      return res.status(404).json({ error: 'Usuario no encontrado o inactivo' });
    }

    const roles = await fetchUserRoles(user.id_usuario);
    const profile = await fetchUserProfile(user.id_usuario, roles);
    const esAdmin = hasAdminRole(roles);
    const needsProfile = computeNeedsProfile(profile);

    return res.json({
      success: true,
      user: {
        id: user.id_usuario,
        dni: user.dni,
        id_rol: roles[0]?.id ?? null,
        rol_nombre: roles[0]?.nombre ?? null,
        roles,
        es_admin: esAdmin,
      },
      profile,
      needsProfile,
    });
  } catch (err) {
    console.error('obtenerPerfilActual exception:', err);
    return res.status(500).json({ error: err.message || 'Error al obtener el perfil' });
  }
};

module.exports = {
  registrarUsuario,
  loginUsuario,
  primerRegistro,
  actualizarPerfil,
  obtenerPerfilActual,
};