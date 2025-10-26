const { supabaseAdmin } = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Función para validar DNI
function isValidDni(dni) {
  return /^\d{7,15}$/.test(dni);
}

// Función para validar contraseña
function isSafePassword(pwd) {
  // Bloquea patrones comunes de inyección SQL y comandos peligrosos
  const forbidden = [
    /('|--|;|\/\*|\*\/|xp_|exec|union|select|insert|delete|update|drop|alter|create|shutdown)/i
  ];
  return (
    typeof pwd === "string" &&
    pwd.length >= 8 &&
    !forbidden.some((regex) => regex.test(pwd))
  );
}

// Helpers
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

async function fetchEquipoPerfil(idUsuario) {
  try {
    const { data, error } = await supabaseAdmin
      .from('equipo')
      .select('nombre, apellido, telefono, email, fecha_nacimiento, profesion, foto_perfil')
      .eq('id_profesional', Number(idUsuario))
      .maybeSingle();
    if (error) {
      console.error('fetchEquipoPerfil error:', error);
      return null;
    }
    return data || null;
  } catch (err) {
    console.error('fetchEquipoPerfil exception:', err);
    return null;
  }
}

function computeNeedsProfile(perfil) {
  if (!perfil) return true;
  const required = [perfil.nombre, perfil.apellido, perfil.telefono];
  return required.some((value) => value === null || value === undefined || String(value).trim() === '');
}

function extractToken(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

// Registrar un usuario (requiere id_rol según esquema)
const registrarUsuario = async (req, res) => {
  try {
    const { dni, contrasena, id_rol } = req.body || {};

    // Validaciones
    if (!isValidDni(dni)) {
      return res.status(400).json({ error: "DNI inválido. Debe tener entre 7 y 15 números." });
    }
    if (!isSafePassword(contrasena)) {
      return res.status(400).json({ error: "Contraseña insegura o inválida." });
    }
    if (id_rol === undefined || id_rol === null || Number.isNaN(Number(id_rol))) {
      return res.status(400).json({ error: "id_rol es obligatorio y debe ser numérico" });
    }

    // encriptar contraseña
    const hash = await bcrypt.hash(contrasena, 12);

    // Verificar si el usuario ya existe con Supabase
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

    // Insertar el nuevo usuario con Supabase — usamos password_hash de acuerdo al esquema
    const payload = { dni: Number(dni), password_hash: hash, id_rol: Number(id_rol) };
    const { data: insertData, error: insertErr } = await supabaseAdmin
      .from('usuarios')
      .insert([payload])
      .select('id_usuario, dni, id_rol')
      .maybeSingle();

    if (insertErr) {
      console.error('Error inserting user:', insertErr);
      throw new Error('Error al registrar el usuario: ' + insertErr.message);
    }

    res.status(201).json({ message: 'Usuario registrado con éxito', user: insertData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Login: valida credenciales y devuelve JWT + flags de primer login/perfil incompleto
const loginUsuario = async (req, res) => {
  try {
    const { dni, contrasena } = req.body || {};
    if (!dni || !contrasena) return res.status(400).json({ error: 'Faltan credenciales' });
    const { data: user, error: findErr } = await supabaseAdmin
      .from('usuarios')
      .select('id_usuario, dni, password_hash, activo, id_rol')
      .eq('dni', Number(dni))
      .limit(1)
      .maybeSingle();

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
      // Migración: si no hay hash y la contraseña es la default, setear hash y continuar
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

    // Detectar primer login por uso de contraseña por defecto
    const firstLogin = String(contrasena) === DEFAULT_PWD;

    const [perfil, rolNombre] = await Promise.all([
      fetchEquipoPerfil(user.id_usuario),
      fetchRoleName(user.id_rol),
    ]);
    const needsProfile = computeNeedsProfile(perfil);

    res.json({
      success: true,
      token,
      user: {
        id: user.id_usuario,
        dni: user.dni,
        id_rol: user.id_rol,
        rol_nombre: rolNombre,
      },
      profile: perfil,
      firstLogin,
      needsProfile,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Primer registro: completa datos de equipo y cambia contraseña
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

    const { nombre, apellido, telefono, fecha_nacimiento, profesion, nuevaContrasena } = req.body || {};

    if (!nombre || !apellido || !telefono || !nuevaContrasena || !fecha_nacimiento) {
      return res.status(400).json({ error: 'Faltan datos obligatorios (nombre, apellido, telefono, fecha_nacimiento, nuevaContrasena)' });
    }
    if (!isValidDateYYYYMMDD(String(fecha_nacimiento))) {
      return res.status(400).json({ error: 'fecha_nacimiento debe tener formato YYYY-MM-DD' });
    }

    // 1) Upsert de equipo
    const equipoPayload = {
      id_profesional: userId,
      nombre,
      apellido,
      telefono,
      fecha_nacimiento: String(fecha_nacimiento),
      profesion: profesion || null,
    };
    // Intentar update, si 0 rows => insert
    const { data: updatedEq, error: updErr } = await supabaseAdmin
      .from('equipo')
      .upsert([equipoPayload], { onConflict: 'id_profesional' })
      .select('id_profesional, nombre, apellido, telefono, fecha_nacimiento, profesion')
      .maybeSingle();
    if (updErr) {
      console.error('primerRegistro upsert equipo error:', updErr);
      return res.status(500).json({ error: 'No se pudo actualizar equipo' });
    }

    // 2) Cambiar contraseña
    const hash = await bcrypt.hash(String(nuevaContrasena), 12);
    const { error: pwdErr } = await supabaseAdmin
      .from('usuarios')
      .update({ password_hash: hash })
      .eq('id_usuario', userId);
    if (pwdErr) {
      console.error('primerRegistro update password error:', pwdErr);
      return res.status(500).json({ error: 'No se pudo actualizar la contraseña' });
    }

    const perfil = await fetchEquipoPerfil(userId);
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

    const [perfil, rolNombre] = await Promise.all([
      fetchEquipoPerfil(user.id_usuario),
      fetchRoleName(user.id_rol),
    ]);
    const needsProfile = computeNeedsProfile(perfil);

    return res.json({
      success: true,
      user: {
        id: user.id_usuario,
        dni: user.dni,
        id_rol: user.id_rol,
        rol_nombre: rolNombre,
      },
      profile: perfil,
      needsProfile,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { registrarUsuario, loginUsuario, primerRegistro, obtenerPerfilActual };