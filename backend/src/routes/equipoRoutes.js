const express = require('express');
const { listEquipo, crearIntegrante, editarIntegrante, editarRecepcion, borrarIntegrante, restablecerContrasena } = require('../controllers/equipoController');
const { authenticate, authorize } = require('../middlewares/auth');
const router = express.Router();

router.get('/', authenticate, authorize(['admin', 'recepcion', 'profesional']), listEquipo);
router.post('/', authenticate, authorize(['admin']), crearIntegrante);
router.put('/recepcion/:id_recepcion', authenticate, authorize(['admin']), editarRecepcion);
router.put('/secretarios/:id_secretario', authenticate, authorize(['admin']), editarRecepcion);
router.put('/:id_profesional', authenticate, authorize(['admin']), editarIntegrante);
router.delete('/:id_profesional', authenticate, authorize(['admin']), borrarIntegrante);
router.post('/:id_usuario/reset-password', authenticate, authorize(['admin']), restablecerContrasena);

module.exports = router;
