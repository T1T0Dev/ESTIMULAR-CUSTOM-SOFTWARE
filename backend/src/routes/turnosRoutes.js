const express = require('express');
const router = express.Router();
const { listTurnos, updateTurno,cancelarTurno, assignTurnosForCandidato } = require('../controllers/turnosController');

// Listar turnos con filtros (?estado=pendiente&disponible=true&nino_id=...)
router.get('/', listTurnos);

// Actualizar turno (asignar/quitar niño, cambiar estado)
router.put('/:id', updateTurno);

// (Opcional) Crear/autoasignar turnos para un candidato
router.post('/assign', assignTurnosForCandidato);

// Cancelar turno
router.put('/cancelar/:id', cancelarTurno);

module.exports = router;
