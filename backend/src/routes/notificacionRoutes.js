const express = require('express');
const router = express.Router();
const { handleGetNotificaciones } = require('../controllers/notificacionController');
const { authenticate, authorize } = require('../middlewares/auth');

// Definir la ruta para obtener notificaciones
router.get('/notificaciones', authenticate, authorize(['admin', 'recepcion', 'profesional']), handleGetNotificaciones);

module.exports = router;
