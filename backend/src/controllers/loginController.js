const db = require("../config/db.js");
const bcrypt = require("bcrypt");

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

// Registrar un usuario
const registrarUsuario = async (req, res) => {
  try {
    const { dni, contrasena } = req.body;

    // Validaciones
    if (!isValidDni(dni)) {
      return res.status(400).json({ error: "DNI inválido. Debe tener entre 7 y 15 números." });
    }
    if (!isSafePassword(contrasena)) {
      return res.status(400).json({ error: "Contraseña insegura o inválida." });
    }

    // encriptar contraseña
    const hash = await bcrypt.hash(contrasena, 10);

    // Verificar si el usuario ya existe con SUPABASE
    const { data: existingUser, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('dni', dni)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: No rows found
      throw new Error('Error al verificar el usuario existente');
    }

    if (existingUser) {
      return res.status(400).json({ error: "El usuario ya existe" });
    }

    // Insertar el nuevo usuario con SUPABASE
    const { insertError } = await supabase
      .from('usuarios')
      .insert([{ dni, contrasena: hash }]);

    if (insertError) {
      throw new Error('Error al registrar el usuario');
    }

    res.status(201).json({ message: "Usuario registrado con éxito" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

  
module.exports = { registrarUsuario, loginUsuario };