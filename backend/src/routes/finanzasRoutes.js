const { Router } = require('express');
const { getResumenMensual } = require('../controllers/finanzasController');
const { authenticate, authorize } = require('../middlewares/auth');

const router = Router();

// GET /api/finanzas/resumen-mensual?anio=2025 - Solo admin
router.get('/finanzas/resumen-mensual', authenticate, authorize(['admin']), getResumenMensual);

module.exports = router;

