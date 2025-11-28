const express = require('express');
const { getCandidatos, editarCandidato, borrarCandidato, setPrincipalResponsable } = require('../controllers/candidatosController');
const { authenticate, authorize } = require('../middlewares/auth');
const router = express.Router();

// Listar candidatos con responsables y estado
router.get('/', authenticate, authorize(['admin', 'recepcion', 'profesional']), getCandidatos);
// Editar candidato
router.put('/:id_candidato', authenticate, authorize(['admin']), editarCandidato);
// Establecer responsable principal
router.put('/:id_candidato/responsable', authenticate, authorize(['admin']), setPrincipalResponsable);
// Borrar candidato
router.delete('/:id_candidato', authenticate, authorize(['admin']), borrarCandidato);


module.exports = router;
