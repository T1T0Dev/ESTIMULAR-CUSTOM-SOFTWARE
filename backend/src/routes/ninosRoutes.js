const express = require('express');
const { getNinos, crearNino, editarNino, borrarNino, getResponsablesDeNino, agregarResponsableANino, editarRelacionResponsable, quitarResponsableDeNino } = require('../controllers/ninosController');

const router = express.Router();

router.get('/', getNinos);
router.post('/', crearNino);
router.put('/:id_nino', editarNino);
router.delete('/:id_nino', borrarNino);
router.get('/:id_nino/responsables', getResponsablesDeNino);
router.post('/:id_nino/responsables', agregarResponsableANino);
router.put('/:id_nino/responsables/:id_nino_responsable', editarRelacionResponsable);
router.delete('/:id_nino/responsables/:id_nino_responsable', quitarResponsableDeNino);

module.exports = router;
