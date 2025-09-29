const express = require('express');
const { getCandidatos, cambiarEstado,editarCandidato,borrarCandidato } = require('../controllers/candidatosController');
const router = express.Router();

// Listar candidatos con responsables y estado
router.get('/', getCandidatos);
// Cambiar estado de entrevista
router.put('/:id_candidato/estado', cambiarEstado);
// Editar candidato
router.put('/:id_candidato', editarCandidato);
// Borrar candidato
router.delete('/:id_candidato', borrarCandidato);


module.exports = router;
