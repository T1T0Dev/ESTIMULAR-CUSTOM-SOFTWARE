
const express = require('express');

const { enviarFormularioEntrevista } = require('../controllers/entrevistaController');

const router = express.Router();

// Ruta para recibir el formulario del footer
router.post('/crear-candidato', enviarFormularioEntrevista);

module.exports = router;
