const express = require('express');
const { handleSearchNinos, handleGetNino } = require('../controllers/ninoController');

const router = express.Router();

router.get('/ninos', handleSearchNinos);
router.get('/ninos/:id', handleGetNino);

module.exports = router;
