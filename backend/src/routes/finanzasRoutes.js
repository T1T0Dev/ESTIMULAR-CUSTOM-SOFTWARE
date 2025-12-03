const { Router } = require('express');
const { getResumenMensual, getResumenMensualDetalle } = require('../controllers/finanzasController');
const { authenticate, authorize } = require('../middlewares/auth');

const router = Router();

// GET /api/finanzas/resumen-mensual?anio=2025 - Admin, recepción y profesionales con vista de pagos
router.get(
	'/finanzas/resumen-mensual',
	authenticate,
	authorize(['admin', 'recepcion', 'profesional']),
	getResumenMensual
);

// GET /api/finanzas/resumen-mensual-detalle?anio=2025&mesIndex=10
router.get(
	'/finanzas/resumen-mensual-detalle',
	authenticate,
	authorize(['admin', 'recepcion', 'profesional']),
	getResumenMensualDetalle
);

module.exports = router;

