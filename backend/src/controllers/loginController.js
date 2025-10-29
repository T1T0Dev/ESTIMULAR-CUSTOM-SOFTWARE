const { supabaseAdmin } = require('../config/db');
const { upsertWithIdentityOverride } = require('../utils/upsertWithIdentityOverride');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {
  resolveStorageAsset,
  deleteStorageAsset,
  uploadProfileImageIfNeeded,
  isHttpUrl,
} = require('../utils/storage');

const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD_LOGIN || 'estimular_2025';

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

// Nota: ya no se usa id_rol en usuarios; los nombres de roles se obtienen desde usuario_roles -> roles

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
        departamento:profesiones!equipo_id_departamento_fkey ( id_departamento, nombre )
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
    const foto = await resolveStorageAsset(data.foto_perfil);
    return {
      tipo: 'profesional',
      id_profesional: data.id_profesional,
      nombre: data.nombre,
      apellido: data.apellido,
      telefono: data.telefono,
      email: data.email,
      fecha_nacimiento: data.fecha_nacimiento,
      foto_perfil: foto.signedUrl || data.foto_perfil,
      foto_perfil_url: foto.signedUrl || null,
      foto_perfil_path: foto.path,
      departamento_id: data.id_departamento || data.departamento?.id_departamento || null,
      departamento: data.departamento
        ? {
          id: data.departamento.id_departamento,
          nombre: data.departamento.nombre,
        }
        : null,
      profesion: data.departamento?.nombre || null,
    };
  } catch (err) {
    console.error('fetchProfessionalProfile exception:', err);
    return null;
  }
}

async function fetchSecretaryProfile(idUsuario) {
  try {
    let data = null;
    let error = null;

    ({ data, error } = await supabaseAdmin
      .from('secretarios')
      .select('id, usuario_id, nombre, apellido, telefono, email, fecha_nacimiento, foto_perfil')
      .eq('usuario_id', Number(idUsuario))
      .maybeSingle());

    if (error && ['42703', 'PGRST204'].includes(error.code)) {
      ({ data, error } = await supabaseAdmin
        .from('secretarios')
        .select('id, nombre, apellido, telefono, email, fecha_nacimiento, foto_perfil')
        .eq('id', Number(idUsuario))
        .maybeSingle());
    }

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('fetchSecretaryProfile error:', error);
      }
      return null;
    }
    if (!data) return null;
    const foto = await resolveStorageAsset(data.foto_perfil);
    return {
      tipo: 'secretario',
      id_secretario: data.usuario_id ?? data.id,
      nombre: data.nombre,
      apellido: data.apellido,
      telefono: data.telefono,
      email: data.email,
      fecha_nacimiento: data.fecha_nacimiento,
      foto_perfil: foto.signedUrl || data.foto_perfil,
      foto_perfil_url: foto.signedUrl || null,
      foto_perfil_path: foto.path,
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
  const required = [
    perfil.nombre,
    perfil.apellido,
    perfil.telefono,
    perfil.fecha_nacimiento,
    perfil.email,
  ];
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
    // Intentar upsert con conflicto en (usuario_id, rol_id); si no hay constraint, fallback a insert simple
    let { error } = await supabaseAdmin
      .from('usuario_roles')
      .upsert(
        [{ usuario_id: Number(usuarioId), rol_id: Number(rolId) }],
        { onConflict: 'usuario_id,rol_id' }
      );
    if (error) {
      // Fallback: intentar insert; ignorar duplicados
      const ins = await supabaseAdmin
        .from('usuario_roles')
        .insert([{ usuario_id: Number(usuarioId), rol_id: Number(rolId) }]);
      if (ins.error && ins.error.code !== '23505') {
        console.error('assignRoleToUser error:', ins.error);
      }
    }
  } catch (err) {
    console.error('assignRoleToUser exception:', err);
  }
}

function isProfessionalProfileComplete(row) {
  if (!row) return false;
  const required = [row.nombre, row.apellido, row.telefono, row.fecha_nacimiento];
  if (required.some((v) => v === null || v === undefined || String(v).trim() === '')) {
    return false;
  }
  if (!row.id_departamento) return false;
  return true;
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

    let insertData = null;
    let insertErr = null;

    ({ data: insertData, error: insertErr } = await supabaseAdmin
      .from('usuarios')
      .insert([basePayload])
      .select('id_usuario, dni, activo')
      .maybeSingle());

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
      .select('id_usuario, dni, password_hash, activo')
      .eq('dni', Number(dni))
      .limit(1)
      .maybeSingle());

    if (findErr) {
      console.error('Error fetching user for login:', findErr);
      return res.status(500).json({ error: 'Error interno' });
    }
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (user.activo === false) {
      return res.status(403).json({ error: 'Usuario inactivo' });
    }

    let match = false;
    if (!user.password_hash) {
      if (String(contrasena) === DEFAULT_PASSWORD) {
        const newHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
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

    const firstLogin = String(contrasena) === DEFAULT_PASSWORD;

    const [perfil, roles] = await Promise.all([
      fetchUserProfile(user.id_usuario),
      fetchUserRoles(user.id_usuario),
    ]);

    const rolNombre = roles[0]?.nombre || null;

    const needsProfile = computeNeedsProfile(perfil);

    res.json({
      success: true,
      token,
      user: {
        id: user.id_usuario,
        dni: user.dni,
        id_rol: roles[0]?.id ?? null,
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
      foto_perfil,
      nuevaContrasena,
    } = req.body || {};

    if (!nombre || !apellido || !telefono || !nuevaContrasena || !fecha_nacimiento || !email) {
      return res.status(400).json({ error: 'Faltan datos obligatorios (nombre, apellido, telefono, email, fecha_nacimiento, nuevaContrasena)' });
    }
    if (!isValidDateYYYYMMDD(String(fecha_nacimiento))) {
      return res.status(400).json({ error: 'fecha_nacimiento debe tener formato YYYY-MM-DD' });
    }

    if (!isSafePassword(String(nuevaContrasena))) {
      return res.status(400).json({ error: 'La nueva contraseña es insegura o inválida' });
    }
    if (String(nuevaContrasena) === DEFAULT_PASSWORD) {
      return res.status(400).json({ error: 'Debes elegir una contraseña distinta a la genérica' });
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

    // Verificar si ya existe perfil profesional completo para evitar múltiples primer-registro
    let existingProfesional = null;
    try {
      const { data: exRow, error: exErr } = await supabaseAdmin
        .from('profesionales')
        .select('id_profesional, nombre, apellido, telefono, email, fecha_nacimiento, foto_perfil, id_departamento')
        .eq('id_profesional', Number(userId))
        .maybeSingle();
      if (exErr && exErr.code !== 'PGRST116') {
        console.warn('primerRegistro fetch existing profesional warn:', exErr.message);
      }
      existingProfesional = exRow || null;
    } catch (e) {
      // ignorar
    }

    let existingSecretario = null;
    let secretariosHasUsuarioIdColumn = true;
    if (resolvedTipo === 'secretario') {
      try {
        const { data: secRow, error: secErr } = await supabaseAdmin
          .from('secretarios')
          .select('id, usuario_id, foto_perfil')
          .eq('usuario_id', Number(userId))
          .maybeSingle();
        if (!secErr || secErr.code === 'PGRST116') {
          existingSecretario = secRow || null;
          secretariosHasUsuarioIdColumn = true;
        } else if (secErr && ['42703', 'PGRST204'].includes(secErr.code)) {
          secretariosHasUsuarioIdColumn = false;
        }
      } catch (e) {
        secretariosHasUsuarioIdColumn = false;
      }

      if (!secretariosHasUsuarioIdColumn) {
        try {
          const { data: secRowById, error: secErrById } = await supabaseAdmin
            .from('secretarios')
            .select('id, foto_perfil')
            .eq('id', Number(userId))
            .maybeSingle();
          if (!secErrById || secErrById.code === 'PGRST116') {
            existingSecretario = secRowById || existingSecretario;
          }
        }
        catch (e) {
          // ignore
        }
      }
    }

    if (resolvedTipo === 'profesional') {
      if (existingProfesional && isProfessionalProfileComplete(existingProfesional)) {
        return res.status(409).json({ error: 'El perfil ya fue completado' });
      }

      const existingProfesionalPath = existingProfesional?.foto_perfil || null;
      let uploadedProfesionalFoto = null;
      if (foto_perfil && typeof foto_perfil === 'string' && foto_perfil.startsWith('data:image')) {
        uploadedProfesionalFoto = await uploadProfileImageIfNeeded(userId, foto_perfil, {
          previousPath: existingProfesionalPath,
        });
      }

      let fotoPathToStore = existingProfesionalPath;
      if (uploadedProfesionalFoto?.path) {
        fotoPathToStore = uploadedProfesionalFoto.path;
      } else if (typeof foto_perfil === 'string' && isHttpUrl(foto_perfil)) {
        fotoPathToStore = foto_perfil;
      }

      const profesionalPayload = {
        id_profesional: userId,
        nombre,
        apellido,
        telefono,
        email: email || null,
        fecha_nacimiento: String(fecha_nacimiento),
        foto_perfil: fotoPathToStore || null,
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
      const existingSecretarioPath = existingSecretario?.foto_perfil || null;
      let uploadedSecretarioFoto = null;
      if (foto_perfil && typeof foto_perfil === 'string' && foto_perfil.startsWith('data:image')) {
        uploadedSecretarioFoto = await uploadProfileImageIfNeeded(userId, foto_perfil, {
          previousPath: existingSecretarioPath,
        });
      }

      let secretarioFotoPath = existingSecretarioPath;
      if (uploadedSecretarioFoto?.path) {
        secretarioFotoPath = uploadedSecretarioFoto.path;
      } else if (typeof foto_perfil === 'string' && isHttpUrl(foto_perfil)) {
        secretarioFotoPath = foto_perfil;
      }

      const secretarioPayload = {
        nombre,
        apellido,
        telefono,
        email: email || null,
        fecha_nacimiento: String(fecha_nacimiento),
        foto_perfil: secretarioFotoPath || null,
      };

      if (secretariosHasUsuarioIdColumn) {
        secretarioPayload.usuario_id = userId;
      }

      let secretarioErr = null;
      ({ error: secretarioErr } = await supabaseAdmin
        .from('secretarios')
        .upsert([secretarioPayload], {
          onConflict: secretariosHasUsuarioIdColumn ? 'usuario_id' : 'id',
          ignoreDuplicates: false,
        }));

      if (secretarioErr && ['42703', '428C9', 'PGRST204'].includes(secretarioErr.code)) {
        try {
          const overridePayload = {
            id: userId,
            nombre,
            apellido,
            telefono,
            email: email || null,
            fecha_nacimiento: String(fecha_nacimiento),
            foto_perfil: secretarioFotoPath || null,
          };
          if (secretariosHasUsuarioIdColumn) {
            overridePayload.usuario_id = userId;
          }

          await upsertWithIdentityOverride('secretarios', overridePayload, { onConflict: 'id' });
          secretarioErr = null;
        } catch (overrideErr) {
          secretarioErr = overrideErr;
        }
      }

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

const actualizarPerfil = async (req, res) => {
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
      profesionId,
      tipoUsuario,
      foto_perfil,
      removeFoto,
    } = req.body || {};

    const currentProfile = await fetchUserProfile(userId);
    if (!currentProfile) {
      return res.status(404).json({ error: 'Perfil no encontrado para el usuario' });
    }

    const previousPhotoPath = currentProfile?.foto_perfil_path || null;

    let resolvedTipo = null;
    if (typeof tipoUsuario === 'string' && tipoUsuario.trim()) {
      resolvedTipo = tipoUsuario.trim().toLowerCase();
    } else if (currentProfile?.tipo) {
      resolvedTipo = currentProfile.tipo;
    } else if (profesionId !== undefined && profesionId !== null && profesionId !== '') {
      resolvedTipo = 'profesional';
    } else {
      resolvedTipo = 'secretario';
    }

    if (resolvedTipo !== 'profesional' && resolvedTipo !== 'secretario') {
      return res.status(400).json({ error: 'Tipo de usuario inválido' });
    }

    if (currentProfile?.tipo && resolvedTipo !== currentProfile.tipo) {
      resolvedTipo = currentProfile.tipo;
    }

    let fotoUrlToStore;
    if (removeFoto === true) {
      fotoUrlToStore = null;
      await deleteStorageAsset(previousPhotoPath);
    } else if (foto_perfil !== undefined) {
      if (typeof foto_perfil === 'string' && foto_perfil.startsWith('data:image')) {
        const uploadResult = await uploadProfileImageIfNeeded(userId, foto_perfil, {
          previousPath: previousPhotoPath,
        });
        fotoUrlToStore = uploadResult?.path || previousPhotoPath || null;
      } else if (foto_perfil === null || (typeof foto_perfil === 'string' && foto_perfil.trim() === '')) {
        fotoUrlToStore = null;
        await deleteStorageAsset(previousPhotoPath);
      } else if (typeof foto_perfil === 'string') {
        fotoUrlToStore = foto_perfil;
        if (previousPhotoPath && foto_perfil !== previousPhotoPath) {
          await deleteStorageAsset(previousPhotoPath);
        }
      }
    }

    if (resolvedTipo === 'profesional') {
      const updatePayload = {};
      if (nombre !== undefined) updatePayload.nombre = nombre;
      if (apellido !== undefined) updatePayload.apellido = apellido;
      if (telefono !== undefined) updatePayload.telefono = telefono;
      if (email !== undefined) updatePayload.email = email || null;

      if (fecha_nacimiento !== undefined) {
        if (!fecha_nacimiento || String(fecha_nacimiento).trim() === '') {
          return res.status(400).json({ error: 'fecha_nacimiento es obligatorio para profesionales' });
        }
        if (!isValidDateYYYYMMDD(String(fecha_nacimiento))) {
          return res.status(400).json({ error: 'fecha_nacimiento debe tener formato YYYY-MM-DD' });
        }
        updatePayload.fecha_nacimiento = String(fecha_nacimiento);
      }

      let departamentoToAssign = null;
      let shouldUpdateDepartment = false;
      if (profesionId !== undefined) {
        shouldUpdateDepartment = true;
        if (profesionId === null || profesionId === '') {
          departamentoToAssign = null;
          updatePayload.id_departamento = null;
        } else {
          const parsedProf = Number(profesionId);
          if (Number.isNaN(parsedProf)) {
            return res.status(400).json({ error: 'profesionId inválido' });
          }
          departamentoToAssign = parsedProf;
          updatePayload.id_departamento = parsedProf;
        }
      }

      if (fotoUrlToStore !== undefined) {
        updatePayload.foto_perfil = fotoUrlToStore;
      }

      if (Object.keys(updatePayload).length === 0 && !shouldUpdateDepartment) {
        return res.status(400).json({ error: 'No hay cambios para actualizar' });
      }

      if (Object.keys(updatePayload).length > 0) {
        const { data: updatedProfesional, error: profesionalErr } = await supabaseAdmin
          .from('profesionales')
          .update(updatePayload)
          .eq('id_profesional', Number(userId))
          .select('id_profesional')
          .maybeSingle();

        if (profesionalErr) {
          if (profesionalErr.code === 'PGRST116') {
            return res.status(404).json({ error: 'Perfil profesional no encontrado' });
          }
          console.error('actualizarPerfil profesionales error:', profesionalErr);
          return res.status(500).json({ error: 'No se pudo actualizar el perfil profesional' });
        }

        if (!updatedProfesional) {
          return res.status(404).json({ error: 'Perfil profesional no encontrado' });
        }
      }

      if (shouldUpdateDepartment) {
        if (departamentoToAssign === null) {
          const { error: delErr } = await supabaseAdmin
            .from('profesional_departamentos')
            .delete()
            .eq('profesional_id', Number(userId));
          if (delErr && delErr.code !== 'PGRST116') {
            console.warn('actualizarPerfil delete profesional_departamentos warn:', delErr.message);
          }
        } else {
          const { error: linkErr } = await supabaseAdmin
            .from('profesional_departamentos')
            .upsert(
              [{ profesional_id: Number(userId), departamento_id: departamentoToAssign }],
              { onConflict: 'profesional_id,departamento_id' }
            );
          if (linkErr && linkErr.code !== '23505') {
            console.warn('actualizarPerfil profesional_departamentos warning:', linkErr.message);
          }
        }
      }
    } else {
      const secretarioPayload = {};
      if (nombre !== undefined) secretarioPayload.nombre = nombre;
      if (apellido !== undefined) secretarioPayload.apellido = apellido;
      if (telefono !== undefined) {
        const telefonoNormalizado = telefono === null ? null : String(telefono).trim();
        secretarioPayload.telefono = !telefonoNormalizado ? null : telefonoNormalizado;
      }
      if (email !== undefined) {
        const emailNormalizado = email === null ? null : String(email).trim();
        secretarioPayload.email = emailNormalizado || null;
      }
      if (fecha_nacimiento !== undefined) {
        if (fecha_nacimiento) {
          if (!isValidDateYYYYMMDD(String(fecha_nacimiento))) {
            return res.status(400).json({ error: 'fecha_nacimiento debe tener formato YYYY-MM-DD' });
          }
          secretarioPayload.fecha_nacimiento = String(fecha_nacimiento);
        } else {
          secretarioPayload.fecha_nacimiento = null;
        }
      }
      if (fotoUrlToStore !== undefined) {
        secretarioPayload.foto_perfil = fotoUrlToStore;
      }

      if (Object.keys(secretarioPayload).length === 0) {
        return res.status(400).json({ error: 'No hay cambios para actualizar' });
      }

      const basePayload = { ...secretarioPayload };
      const numericUserId = Number(userId);

      let secretariosHasUsuarioIdColumn = true;
      let existingSecretario = null;

      try {
        const { data: secretarioByUsuario, error: secretarioByUsuarioError } = await supabaseAdmin
          .from('secretarios')
          .select('id, usuario_id')
          .eq('usuario_id', numericUserId)
          .maybeSingle();

        if (secretarioByUsuarioError && secretarioByUsuarioError.code !== 'PGRST116') {
          if (['42703', 'PGRST204'].includes(secretarioByUsuarioError.code)) {
            secretariosHasUsuarioIdColumn = false;
          } else {
            throw secretarioByUsuarioError;
          }
        } else if (secretarioByUsuario) {
          existingSecretario = secretarioByUsuario;
        }
      } catch (lookupErr) {
        if (lookupErr && ['42703', 'PGRST204'].includes(lookupErr.code)) {
          secretariosHasUsuarioIdColumn = false;
        } else {
          console.warn('actualizarPerfil secretario lookup warn:', lookupErr);
        }
      }

      if (!existingSecretario) {
        try {
          const { data: secretarioById, error: secretarioByIdError } = await supabaseAdmin
            .from('secretarios')
            .select('id')
            .eq('id', numericUserId)
            .maybeSingle();

          if (!secretarioByIdError || secretarioByIdError.code === 'PGRST116') {
            existingSecretario = secretarioById || null;
          } else if (!['42703', 'PGRST204'].includes(secretarioByIdError.code)) {
            console.warn('actualizarPerfil secretario lookup by id warn:', secretarioByIdError);
          }
        } catch (lookupByIdErr) {
          console.warn('actualizarPerfil secretario lookup by id exception:', lookupByIdErr);
        }
      }

      try {
        if (existingSecretario) {
          const targetColumn = secretariosHasUsuarioIdColumn ? 'usuario_id' : 'id';
          const { error: updateErr } = await supabaseAdmin
            .from('secretarios')
            .update(basePayload)
            .eq(targetColumn, numericUserId);

          if (updateErr && updateErr.code !== 'PGRST116') {
            if (['42703', 'PGRST204'].includes(updateErr.code)) {
              secretariosHasUsuarioIdColumn = false;
              existingSecretario = null;
            } else {
              throw updateErr;
            }
          }

          if (updateErr && updateErr.code === 'PGRST116') {
            existingSecretario = null;
          }
        }

        if (!existingSecretario) {
          const insertPayload = {
            ...basePayload,
            id: numericUserId,
            ...(secretariosHasUsuarioIdColumn ? { usuario_id: numericUserId } : {}),
          };

          await upsertWithIdentityOverride('secretarios', insertPayload, { onConflict: 'id' });
        }
      } catch (secretarioErr) {
        console.error('actualizarPerfil secretarios error:', secretarioErr);
        return res.status(500).json({ error: 'No se pudo actualizar el perfil de secretario' });
      }
    }

    const [perfilActualizado, roles] = await Promise.all([
      fetchUserProfile(userId),
      fetchUserRoles(userId),
    ]);

    const { data: usuarioRow, error: usuarioErr } = await supabaseAdmin
      .from('usuarios')
      .select('id_usuario, dni, activo')
      .eq('id_usuario', Number(userId))
      .maybeSingle();

    if (usuarioErr) {
      console.error('actualizarPerfil usuario error:', usuarioErr);
    }

    const rolNombre = roles[0]?.nombre || null;

    return res.json({
      success: true,
      profile: perfilActualizado,
      user: usuarioRow
        ? {
          id: usuarioRow.id_usuario,
          dni: usuarioRow.dni,
          activo: usuarioRow.activo,
          id_rol: roles[0]?.id ?? null,
          rol_nombre: rolNombre,
          roles,
        }
        : {
          id: userId,
          id_rol: roles[0]?.id ?? null,
          rol_nombre: rolNombre,
          roles,
        },
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
    } catch (e) {
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

    const [perfil, roles] = await Promise.all([
      fetchUserProfile(user.id_usuario),
      fetchUserRoles(user.id_usuario),
    ]);

    const rolNombre = roles[0]?.nombre || null;

    const needsProfile = computeNeedsProfile(perfil);

    return res.json({
      success: true,
      user: {
        id: user.id_usuario,
        dni: user.dni,
        id_rol: roles[0]?.id ?? null,
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

module.exports = { registrarUsuario, loginUsuario, primerRegistro, actualizarPerfil, obtenerPerfilActual };