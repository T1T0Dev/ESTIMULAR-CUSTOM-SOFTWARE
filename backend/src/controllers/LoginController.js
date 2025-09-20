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

    await db.query(
      "INSERT INTO usuarios (dni, contrasena) VALUES (?, ?)",
      [dni, hash]
    );

    res.status(201).json({ message: "Usuario registrado con éxito" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Iniciar sesión
const loginUsuario = async (req, res) => {
  try {
    const { dni, contrasena } = req.body;

    // Validaciones
    if (!isValidDni(dni)) {
      return res.status(400).json({ error: "DNI inválido." });
    }
    if (!isSafePassword(contrasena)) {
      return res.status(400).json({ error: "Contraseña insegura o inválida." });
    }

    const [rows] = await db.query("SELECT * FROM usuarios WHERE dni = ?", [dni]);

    if (rows.length === 0) {
      return res.status(400).json({ error: "Usuario no encontrado" });
    }

    const usuario = rows[0];

    const coincide = await bcrypt.compare(contrasena, usuario.contrasena);

    if (!coincide) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    // Nunca devuelvas la contraseña (ni siquiera hasheada)
    delete usuario.contrasena;

    res.json({ message: "Login exitoso", usuario });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { registrarUsuario, loginUsuario };

