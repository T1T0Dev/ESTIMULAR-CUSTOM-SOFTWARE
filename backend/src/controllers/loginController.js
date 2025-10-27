const { supabaseAdmin } = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Función para validar DNI
function isValidDni(dni) {
  return /^\d{7,15}$/.test(dni);
}

// Función para validar contraseña
function isSafePassword(pwd) {
  const forbidden = [/('|--|;|\/\*|\*\/|xp_|exec|union|select|insert|delete|update|drop|alter|create|shutdown)/i];
  return (
    typeof pwd === 'string' &&
    pwd.length >= 8 &&
    !forbidden.some((regex) => regex.test(pwd))
  );
}

function isValidDateYYYYMMDD(s) {
  if (!s || typeof s !== 'string') return false;
  const m = s.match(/^\d{4}-\d{2}-\d{2}$/);
  if (!m) return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
}

async function fetchRoleName(idRol) {
  if (!idRol) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from('roles')
      .select('id_rol, nombre_rol')
      .eq('id_rol', Number(idRol))
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('fetchRoleName error:', error);
      return null;
    }
    return data ? data.nombre_rol : null;
  } catch (err) {
    console.error('fetchRoleName exception:', err);
    return null;
  }
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
    return (data || [])
      .map((row) => ({
        id: row.rol_id ?? row.rol?.id_rol ?? null,
        nombre: row.rol?.nombre_rol ?? null,
      }))
      .filter((r) => r.id || r.nombre);
  } catch (err) {
    console.error('fetchUserRoles exception:', err);
    return [];
  }
}

async function fetchProfessionalProfile(idUsuario) {
  try {
    const { data, error } = await supabaseAdmin
      .from('profesionales')
      .select(`
        id_profesional,
        nombre,
        apellido,
        telefono,
        email,
        fecha_nacimiento,
        foto_perfil,
        id_departamento,
        departamento:profesiones ( id_departamento, nombre )
      `)
      .eq('id_profesional', Number(idUsuario))
      .maybeSingle();
    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('fetchProfessionalProfile error:', error);
      }
      return null;
    }
    if (!data) return null;
    return {
      tipo: 'profesional',
      id_profesional: data.id_profesional,
      nombre: data.nombre,
      apellido: data.apellido,
      telefono: data.telefono,
      email: data.email,
      fecha_nacimiento: data.fecha_nacimiento,
      foto_perfil: data.foto_perfil,
      departamento_id: data.id_departamento || data.departamento?.id_departamento || null,
      departamento: data.departamento
        ? {
          id: data.departamento.id_departamento,
          nombre: data.departamento.nombre,
        }
        : null,
    };
  } catch (err) {
    console.error('fetchProfessionalProfile exception:', err);
    return null;
  }
}

async function fetchSecretaryProfile(idUsuario) {
  try {
    const { data, error } = await supabaseAdmin
      .from('secretarios')
      .select('id, nombre, apellido, telefono, email, fecha_nacimiento, foto_perfil')
      .eq('id', Number(idUsuario))
      .maybeSingle();
    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('fetchSecretaryProfile error:', error);
      }
      return null;
    }
    if (!data) return null;
    return {
      tipo: 'secretario',
      id_secretario: data.id,
      nombre: data.nombre,
      apellido: data.apellido,
      telefono: data.telefono,
      email: data.email,
      fecha_nacimiento: data.fecha_nacimiento,
      foto_perfil: data.foto_perfil,
    };
  } catch (err) {
    console.error('fetchSecretaryProfile exception:', err);
    return null;
  }
}

async function fetchUserProfile(idUsuario) {
  const profesional = await fetchProfessionalProfile(idUsuario);
  if (profesional) return profesional;
  const secretario = await fetchSecretaryProfile(idUsuario);
  if (secretario) return secretario;
  return null;
}

function computeNeedsProfile(perfil) {
  if (!perfil) return true;
  const required = [perfil.nombre, perfil.apellido, perfil.telefono, perfil.fecha_nacimiento];
  if (required.some((value) => value === null || value === undefined || String(value).trim() === '')) {
    return true;
  }
  if (perfil.tipo === 'profesional') {
    return !perfil.departamento_id;
  }
  return false;
}

function extractToken(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

async function assignRoleToUser(usuarioId, rolId) {
  if (!usuarioId || !rolId) return;
  try {
    const { error } = await supabaseAdmin
      .from('usuario_roles')
      .upsert(
        [{ usuario_id: Number(usuarioId), rol_id: Number(rolId) }],
        { onConflict: 'usuario_id' }
      );
    if (error && error.code !== '23505') {
      console.error('assignRoleToUser error:', error);
    }
  } catch (err) {
    console.error('assignRoleToUser exception:', err);
  }
}

async function resolveRoleIdMaybe(body) {
  if (!body) return null;
  const idCandidate = body.id_rol ?? body.rol_id;
  if (idCandidate !== undefined && idCandidate !== null && !Number.isNaN(Number(idCandidate))) {
    return Number(idCandidate);
  }
  if (body.rolNombre) {
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
  return null;
}

// Registrar un usuario (requiere rol)
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

    const hash = await bcrypt.hash(contrasena, 12);

    const { data: existingUser, error: findErr } = await supabaseAdmin
      .from('usuarios')
      .select('id_usuario, dni')
      .eq('dni', Number(dni))
      .limit(1)
      .maybeSingle();

    if (findErr) {
      console.error('Error checking existing user:', findErr);
      throw new Error('Error al verificar el usuario existente');
    }

    if (existingUser) {
      return res.status(409).json({ error: 'El usuario ya existe' });
    }

    const basePayload = { dni: Number(dni), password_hash: hash, activo: true };
    if (roleId !== null && roleId !== undefined) {
      basePayload.id_rol = Number(roleId);
    }

    let insertData = null;
    let insertErr = null;

    ({ data: insertData, error: insertErr } = await supabaseAdmin
      .from('usuarios')
      .insert([basePayload])
      .select('id_usuario, dni, activo, id_rol')
      .maybeSingle());

    if (insertErr && insertErr.message && insertErr.message.includes('column "id_rol"')) {
      const retryPayload = { ...basePayload };
      delete retryPayload.id_rol;
      ({ data: insertData, error: insertErr } = await supabaseAdmin
        .from('usuarios')
        .insert([retryPayload])
        .select('id_usuario, dni, activo')
        .maybeSingle());
    }

    if (insertErr) {
      console.error('Error inserting user:', insertErr);
      throw new Error('Error al registrar el usuario: ' + insertErr.message);
    }

    await assignRoleToUser(insertData.id_usuario, roleId);

    res.status(201).json({
      message: 'Usuario registrado con éxito',
      user: { ...insertData, id_rol: roleId },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Login
const loginUsuario = async (req, res) => {
  try {
    const { dni, contrasena } = req.body || {};
    if (!dni || !contrasena) return res.status(400).json({ error: 'Faltan credenciales' });

    let user = null;
    let findErr = null;

    ({ data: user, error: findErr } = await supabaseAdmin
      .from('usuarios')
      .select('id_usuario, dni, password_hash, activo, id_rol')
      .eq('dni', Number(dni))
      .limit(1)
      .maybeSingle());

    if (findErr && findErr.message && findErr.message.includes('column "id_rol"')) {
      ({ data: user, error: findErr } = await supabaseAdmin
        .from('usuarios')
        .select('id_usuario, dni, password_hash, activo')
        .eq('dni', Number(dni))
        .limit(1)
        .maybeSingle());
      if (user) user.id_rol = null;
    }

    if (findErr) {
      console.error('Error fetching user for login:', findErr);
      return res.status(500).json({ error: 'Error interno' });
    }
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (user.activo === false) {
      return res.status(403).json({ error: 'Usuario inactivo' });
    }

    const DEFAULT_PWD = 'estimular_2025';
    let match = false;
    if (!user.password_hash) {
      if (String(contrasena) === DEFAULT_PWD) {
        const newHash = await bcrypt.hash(DEFAULT_PWD, 12);
        const { error: updPwdErr } = await supabaseAdmin
          .from('usuarios')
          .update({ password_hash: newHash })
          .eq('id_usuario', user.id_usuario);
        if (updPwdErr) {
          console.error('Error setting default password hash during login:', updPwdErr);
          return res.status(500).json({ error: 'No se pudo validar credenciales' });
        }
        match = true;
      } else {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }
    } else {
      match = await bcrypt.compare(contrasena, user.password_hash || '');
      if (!match) return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    const token = jwt.sign({ id: user.id_usuario, dni: user.dni }, secret, {
      expiresIn: '8h',
    });

    const firstLogin = String(contrasena) === DEFAULT_PWD;

    const [perfil, roles] = await Promise.all([
      fetchUserProfile(user.id_usuario),
      fetchUserRoles(user.id_usuario),
    ]);

    let rolNombre = roles[0]?.nombre || null;
    if (!rolNombre) {
      rolNombre = await fetchRoleName(user.id_rol);
    }

    const needsProfile = computeNeedsProfile(perfil);

    res.json({
      success: true,
      token,
      user: {
        id: user.id_usuario,
        dni: user.dni,
        id_rol: user.id_rol ?? roles[0]?.id ?? null,
        rol_nombre: rolNombre,
        roles,
      },
      profile: perfil,
      firstLogin,
      needsProfile,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Primer registro
const primerRegistro = async (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Token requerido' });
    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch (e) {
      return res.status(401).json({ error: 'Token inválido' });
    }
    const userId = payload.id;

    const {
      nombre,
      apellido,
      telefono,
      fecha_nacimiento,
      email,
      seleccion,
      tipoUsuario,
      profesionId,
      nuevaContrasena,
    } = req.body || {};

    if (!nombre || !apellido || !telefono || !nuevaContrasena || !fecha_nacimiento) {
      return res.status(400).json({ error: 'Faltan datos obligatorios (nombre, apellido, telefono, fecha_nacimiento, nuevaContrasena)' });
    }
    if (!isValidDateYYYYMMDD(String(fecha_nacimiento))) {
      return res.status(400).json({ error: 'fecha_nacimiento debe tener formato YYYY-MM-DD' });
    }

    let resolvedTipo = null;
    let resolvedProfesionId = null;

    if (typeof seleccion === 'string' && seleccion.trim() !== '') {
      if (seleccion === 'secretario') {
        resolvedTipo = 'secretario';
      } else if (!Number.isNaN(Number(seleccion))) {
        resolvedTipo = 'profesional';
        resolvedProfesionId = Number(seleccion);
      }
    }

    if (!resolvedTipo && typeof tipoUsuario === 'string' && tipoUsuario.trim() !== '') {
      resolvedTipo = tipoUsuario.trim().toLowerCase();
    }

    if (resolvedProfesionId === null && profesionId !== undefined && profesionId !== null && !Number.isNaN(Number(profesionId))) {
      resolvedProfesionId = Number(profesionId);
    }

    if (!resolvedTipo) {
      resolvedTipo = resolvedProfesionId ? 'profesional' : 'secretario';
    }

    if (resolvedTipo === 'profesional' && !resolvedProfesionId) {
      return res.status(400).json({ error: 'Seleccioná una profesión válida' });
    }

    if (resolvedTipo !== 'profesional' && resolvedTipo !== 'secretario') {
      return res.status(400).json({ error: 'Tipo de usuario inválido' });
    }

    if (resolvedTipo === 'profesional') {
      const profesionalPayload = {
        id_profesional: userId,
        nombre,
        apellido,
        telefono,
        email: email || null,
        fecha_nacimiento: String(fecha_nacimiento),
        foto_perfil: null,
        id_departamento: resolvedProfesionId,
      };

      const { error: profesionalErr } = await supabaseAdmin
        .from('profesionales')
        .upsert([profesionalPayload], { onConflict: 'id_profesional' });
      if (profesionalErr) {
        console.error('primerRegistro upsert profesionales error:', profesionalErr);
        return res.status(500).json({ error: 'No se pudo actualizar el perfil profesional' });
      }

      const { error: linkErr } = await supabaseAdmin
        .from('profesional_departamentos')
        .upsert(
          [{ profesional_id: userId, departamento_id: resolvedProfesionId }],
          { onConflict: 'profesional_id,departamento_id' }
        );
      if (linkErr && linkErr.code !== '23505') {
        console.warn('primerRegistro profesional_departamentos warning:', linkErr.message);
      }
    } else {
      const secretarioPayload = {
        id: userId,
        nombre,
        apellido,
        telefono,
        email: email || null,
        fecha_nacimiento: String(fecha_nacimiento),
        foto_perfil: null,
      };

      const { error: secretarioErr } = await supabaseAdmin
        .from('secretarios')
        .upsert([secretarioPayload], { onConflict: 'id' });
      if (secretarioErr) {
        console.error('primerRegistro upsert secretarios error:', secretarioErr);
        return res.status(500).json({ error: 'No se pudo actualizar el perfil de secretario' });
      }
    }

    const hash = await bcrypt.hash(String(nuevaContrasena), 12);
    const { error: pwdErr } = await supabaseAdmin
      .from('usuarios')
      .update({ password_hash: hash })
      .eq('id_usuario', userId);
    if (pwdErr) {
      console.error('primerRegistro update password error:', pwdErr);
      return res.status(500).json({ error: 'No se pudo actualizar la contraseña' });
    }

    const perfil = await fetchUserProfile(userId);
    return res.json({ success: true, profile: perfil });
  } catch (err) {
    return res.status(500).json({ error: err.message });
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
    } catch (e) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const userId = payload.id;
    const { data: user, error } = await supabaseAdmin
      .from('usuarios')
      .select('id_usuario, dni, id_rol, activo')
      .eq('id_usuario', Number(userId))
      .maybeSingle();

    if (error) {
      console.error('obtenerPerfilActual user error:', error);
      return res.status(500).json({ error: 'Error interno' });
    }
    if (!user || user.activo === false) {
      return res.status(404).json({ error: 'Usuario no encontrado o inactivo' });
    }

    const [perfil, roles] = await Promise.all([
      fetchUserProfile(user.id_usuario),
      fetchUserRoles(user.id_usuario),
    ]);

    let rolNombre = roles[0]?.nombre || null;
    if (!rolNombre) {
      rolNombre = await fetchRoleName(user.id_rol);
    }

    const needsProfile = computeNeedsProfile(perfil);

    return res.json({
      success: true,
      user: {
        id: user.id_usuario,
        dni: user.dni,
        id_rol: user.id_rol ?? roles[0]?.id ?? null,
        rol_nombre: rolNombre,
        roles,
      },
      profile: perfil,
      needsProfile,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { registrarUsuario, loginUsuario, primerRegistro, obtenerPerfilActual };