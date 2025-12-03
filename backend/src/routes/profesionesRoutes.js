const express = require('express');
const { listProfesiones } = require('../controllers/profesionesController');

const router = express.Router();

router.get('/', listProfesiones);

module.exports = router;
