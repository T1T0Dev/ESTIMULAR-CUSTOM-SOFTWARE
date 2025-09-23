// backend/routes/contactRoutes.js
const express = require('express');
const { enviarEmail } = require('../controllers/contactController');

const router = express.Router();


// Ruta para recibir el formulario del footer
router.post('/enviar-mail', enviarEmail);

module.exports = router;
