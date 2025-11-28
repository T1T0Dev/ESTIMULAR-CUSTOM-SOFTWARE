// backend/routes/contactRoutes.js
const express = require('express');

const { enviarEmail } = require('../controllers/contactoController');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();


// Ruta para recibir el formulario del footer
router.post('/enviar-mail', authenticate, authorize(['admin', 'recepcion', 'profesional']), enviarEmail);

module.exports = router;
