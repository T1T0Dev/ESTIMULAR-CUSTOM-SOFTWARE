const express = require('express');
const router = express.Router();
const { listTurnos, updateTurno, cancelarTurno, assignTurnosForCandidato } = require('../controllers/turnosController');
const { authenticate, authorize } = require('../middlewares/auth');

// Listar turnos con filtros (?estado=pendiente&disponible=true&nino_id=...)
router.get('/', authenticate, authorize(['admin', 'recepcion', 'profesional']), listTurnos);

// Actualizar turno (admins con edición completa, profesionales/recepción solo estado)
router.put('/:id', authenticate, authorize(['admin', 'profesional', 'recepcion']), updateTurno);

// (Opcional) Crear/autoasignar turnos para un candidato - Solo admin
router.post('/assign', authenticate, authorize(['admin']), assignTurnosForCandidato);

// Cancelar turno - Admin o profesional asignado (permisos verificados en controlador)
router.put('/cancelar/:id', authenticate, cancelarTurno);

module.exports = router;
