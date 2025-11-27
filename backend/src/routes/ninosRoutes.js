const express = require('express');
const { getNinos, crearNino, editarNino, borrarNino, getResponsablesDeNino, agregarResponsableANino, editarRelacionResponsable, quitarResponsableDeNino } = require('../controllers/ninosController');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticate, authorize(['admin', 'recepcion', 'profesional']), getNinos);
router.post('/', authenticate, authorize(['admin']), crearNino);
router.put('/:id_nino', authenticate, authorize(['admin']), editarNino);
router.delete('/:id_nino', authenticate, authorize(['admin']), borrarNino);
router.get('/:id_nino/responsables', authenticate, authorize(['admin', 'recepcion', 'profesional']), getResponsablesDeNino);
router.post('/:id_nino/responsables', authenticate, authorize(['admin']), agregarResponsableANino);
router.put('/:id_nino/responsables/:id_nino_responsable', authenticate, authorize(['admin']), editarRelacionResponsable);
router.delete('/:id_nino/responsables/:id_nino_responsable', authenticate, authorize(['admin']), quitarResponsableDeNino);

module.exports = router;
