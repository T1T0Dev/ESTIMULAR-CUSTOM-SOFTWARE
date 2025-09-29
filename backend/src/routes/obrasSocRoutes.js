const express = require("express");

const { obtenerTodasLasObrasSociales} = require("../controllers/obrasSocController");

const router = express.Router();

router.get("/", obtenerTodasLasObrasSociales);

module.exports = router;