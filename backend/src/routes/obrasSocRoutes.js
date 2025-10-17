const express = require('express');
const {
    listarObrasSociales,
    listarEstadosObraSocial,
    crearObraSocial,
    editarObraSocial,
    borrarObraSocial,
} = require('../controllers/obrasSocController');

const router = express.Router();

router.get('/', listarObrasSociales);
router.get('/estados', listarEstadosObraSocial);
router.post('/', crearObraSocial);
router.put('/:id', editarObraSocial);
router.delete('/:id', borrarObraSocial);

module.exports = router;