const express = require('express');
const router = express.Router();
const {
	handleGetPagos,
	handleUpdatePago,
	handleGetPagosDashboardDeudas,
	handleGetPacienteDeudaStatus,
} = require('../controllers/pagoController');
const { authenticate, authorize } = require('../middlewares/auth');

// Definir las rutas para los pagos - con permisos
router.get(
	'/pagos/dashboard/deudas',
	authenticate,
	authorize(['admin', 'recepcion', 'profesional']),
	handleGetPagosDashboardDeudas
);
router.get(
	'/pagos/paciente-deuda',
	authenticate,
	authorize(['admin', 'profesional', 'recepcion']),
	handleGetPacienteDeudaStatus
);
router.get(
	'/pagos',
	authenticate,
	authorize(['admin', 'profesional', 'recepcion']),
	handleGetPagos
);
router.put(
	'/pagos/:id',
	authenticate,
	authorize(['admin', 'recepcion', 'profesional']),
	handleUpdatePago
);

module.exports = router;
