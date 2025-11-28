const express = require('express');
const router = express.Router();
const { listTurnos, updateTurno, cancelarTurno, assignTurnosForCandidato } = require('../controllers/turnosController');
const { authenticate, authorize } = require('../middlewares/auth');

// Listar turnos con filtros (?estado=pendiente&disponible=true&nino_id=...)
router.get('/', authenticate, authorize(['admin', 'recepcion', 'profesional']), listTurnos);

// Actualizar turno (asignar/quitar niño, cambiar estado) - Solo admin
router.put('/:id', authenticate, authorize(['admin']), updateTurno);

// (Opcional) Crear/autoasignar turnos para un candidato - Solo admin
router.post('/assign', authenticate, authorize(['admin']), assignTurnosForCandidato);

// Cancelar turno - Solo admin
router.put('/cancelar/:id', authenticate, authorize(['admin']), cancelarTurno);

module.exports = router;
