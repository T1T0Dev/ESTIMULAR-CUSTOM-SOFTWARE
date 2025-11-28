
const express = require('express');

const { enviarFormularioEntrevista } = require('../controllers/entrevistaController');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

// Ruta para recibir el formulario del footer
router.post('/crear-candidato', authenticate, authorize(['admin', 'recepcion']), enviarFormularioEntrevista);

module.exports = router;
