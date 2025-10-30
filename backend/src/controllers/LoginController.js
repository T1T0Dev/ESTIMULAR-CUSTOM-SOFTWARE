const supabase = require("../config/db.js");
const bcrypt = require("bcrypt");

const DEFAULT_ROLE_CANDIDATES = (process.env.DEFAULT_ROLE_NAME || "profesional")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);

// Función para validar DNI
function isValidDni(dni) {
  return /^\d{7,15}$/.test(dni);
}

// Función para validar contraseña
function isSafePassword(pwd) {
  const forbidden = [
    /('|--|;|\/\*|\*\/|xp_|exec|union|select|insert|delete|update|drop|alter|create|shutdown)/i,
  ];
  return (
    typeof pwd === "string" &&
    pwd.length >= 8 &&
    !forbidden.some((regex) => regex.test(pwd))
  );
}

let cachedDefaultRoleId = null;

async function resolveDefaultRoleId() {
  if (cachedDefaultRoleId) return cachedDefaultRoleId;

  const roleNames = Array.from(
    new Set([
      ...DEFAULT_ROLE_CANDIDATES,
      "profesional",
      "Profesional",
    ])
  );

  for (const nombre_rol of roleNames) {
    const { data, error } = await supabase
      .from("roles")
      .select("id_rol")
      .eq("nombre_rol", nombre_rol)
      .maybeSingle();

    if (error) throw error;
    if (data?.id_rol) {
      cachedDefaultRoleId = data.id_rol;
      return cachedDefaultRoleId;
    }
  }

  const { data, error } = await supabase
    .from("roles")
    .select("id_rol")
    .order("id_rol", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id_rol) {
    throw new Error("No se encontró ningún rol configurado en el sistema.");
  }

  cachedDefaultRoleId = data.id_rol;
  return cachedDefaultRoleId;
}

// Registrar un usuario
const registrarUsuario = async (req, res) => {
  try {
    const { dni, contrasena } = req.body;

    if (!isValidDni(dni)) {
      return res
        .status(400)
        .json({ error: "DNI inválido. Debe tener entre 7 y 15 números." });
    }
    if (!isSafePassword(contrasena)) {
      return res.status(400).json({ error: "Contraseña insegura o inválida." });
    }

    const hash = await bcrypt.hash(contrasena, 10);
    const roleId = await resolveDefaultRoleId();

    const { data: usuarioInsertado, error: insertError } = await supabase
      .from("usuarios")
      .insert({ dni, password_hash: hash })
      .select("id_usuario, dni, activo")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return res.status(409).json({ error: "El usuario ya existe." });
      }
      throw insertError;
    }

    try {
      const { error: rolError } = await supabase
        .from("usuario_roles")
        .insert({ usuario_id: usuarioInsertado.id_usuario, rol_id: roleId });

      if (rolError) throw rolError;
    } catch (rolError) {
      await supabase
        .from("usuarios")
        .delete()
        .eq("id_usuario", usuarioInsertado.id_usuario);
      throw rolError;
    }

    res.status(201).json({ message: "Usuario registrado con éxito" });
  } catch (error) {
    console.error("Error en registrarUsuario:", error);
    res.status(500).json({ error: error.message });
  }
};

// Iniciar sesión
const loginUsuario = async (req, res) => {
  try {
    const { dni, contrasena } = req.body;

    if (!isValidDni(dni)) {
      return res.status(400).json({ error: "DNI inválido." });
    }
    if (!isSafePassword(contrasena)) {
      return res.status(400).json({ error: "Contraseña insegura o inválida." });
    }

    const { data: usuario, error } = await supabase
      .from("usuarios")
      .select(`
        id_usuario,
        dni,
        password_hash,
        activo,
        creado_en,
        actualizado_en,
        roles:usuario_roles (
          rol:roles (
            id_rol,
            nombre_rol
          )
        )
      `)
      .eq("dni", dni)
      .maybeSingle();

    if (error) throw error;
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (usuario.activo === false) {
      return res.status(403).json({ error: "Usuario inactivo" });
    }

    const coincide = await bcrypt.compare(
      contrasena,
      usuario.password_hash || ""
    );

    if (!coincide) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    const roles = Array.isArray(usuario.roles)
      ? usuario.roles
          .map((rel) => ({
            id_rol: rel?.rol?.id_rol ?? null,
            nombre_rol: rel?.rol?.nombre_rol ?? null,
          }))
          .filter((rol) => rol.id_rol || rol.nombre_rol)
      : [];

    const usuarioRespuesta = {
      id_usuario: usuario.id_usuario,
      dni: usuario.dni,
      activo: usuario.activo,
      creado_en: usuario.creado_en,
      actualizado_en: usuario.actualizado_en,
      roles,
    };

    res.json({ message: "Login exitoso", usuario: usuarioRespuesta });
  } catch (error) {
    console.error("Error en loginUsuario:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { registrarUsuario, loginUsuario };
