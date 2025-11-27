const express = require('express');
const {
    listarObrasSociales,
    listarEstadosObraSocial,
    crearObraSocial,
    editarObraSocial,
    borrarObraSocial,
} = require('../controllers/obrasSocController');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticate, authorize(['admin', 'recepcion', 'profesional']), listarObrasSociales);
router.get('/estados', authenticate, authorize(['admin', 'recepcion', 'profesional']), listarEstadosObraSocial);
router.post('/', authenticate, authorize(['admin']), crearObraSocial);
router.put('/:id', authenticate, authorize(['admin']), editarObraSocial);
router.delete('/:id', authenticate, authorize(['admin']), borrarObraSocial);

module.exports = router;