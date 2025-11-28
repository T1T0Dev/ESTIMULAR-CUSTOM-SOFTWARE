const express = require('express');
const { listProfesiones } = require('../controllers/profesionesController');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticate, authorize(['admin', 'recepcion', 'profesional']), listProfesiones);

module.exports = router;
