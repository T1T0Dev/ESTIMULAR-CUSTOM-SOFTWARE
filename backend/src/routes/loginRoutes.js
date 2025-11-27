const express = require("express");
const {
  registrarUsuario,
  loginUsuario,
  primerRegistro,
  actualizarPerfil,
  obtenerPerfilActual,
} = require("../controllers/loginController");
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

// Soporte legacy: POST /api/login
router.post("/", loginUsuario);

// Rutas nuevas
router.post("/login", loginUsuario);
router.post("/register", registrarUsuario);
router.post("/primer-registro", primerRegistro);
router.put("/perfil", authenticate, authorize(['admin', 'recepcion', 'profesional']), actualizarPerfil);
router.get("/me", authenticate, authorize(['admin', 'recepcion', 'profesional']), obtenerPerfilActual);

module.exports = router;