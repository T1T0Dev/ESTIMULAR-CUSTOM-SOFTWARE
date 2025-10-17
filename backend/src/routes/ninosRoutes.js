const express = require('express');
const { getNinos, crearNino, editarNino, borrarNino } = require('../controllers/ninosController');

const router = express.Router();

router.get('/', getNinos);
router.post('/', crearNino);
router.put('/:id_nino', editarNino);
router.delete('/:id_nino', borrarNino);

module.exports = router;
