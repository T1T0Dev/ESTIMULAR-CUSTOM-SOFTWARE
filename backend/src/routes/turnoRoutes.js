const express = require('express');
const router = express.Router();
const { handleGetTurnos, handleUpdateTurno } = require('../controllers/turnoController');

// Definir las rutas para los turnos
router.get('/turnos', handleGetTurnos);
router.put('/turnos/:id', handleUpdateTurno);

module.exports = router;
