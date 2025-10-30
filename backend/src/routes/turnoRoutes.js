const express = require('express');
const router = express.Router();
const {
	handleGetTurnos,
	handleGetTurnoFormData,
	handleCreateTurno,
	handleUpdateTurno,
} = require('../controllers/turnoController');

// Definir las rutas para los turnos
router.get('/turnos/form-data', handleGetTurnoFormData);
router.get('/turnos', handleGetTurnos);
router.post('/turnos', handleCreateTurno);
router.put('/turnos/:id', handleUpdateTurno);

module.exports = router;
