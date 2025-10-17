const express = require('express');
const { buscarPorDni, listarResponsables, listarNinosDeResponsable, actualizarResponsable, eliminarResponsable } = require('../controllers/responsablesController');
const router = express.Router();

// GET /api/responsables?dni=44028630  -> busca por DNI
router.get('/', async (req, res) => {
    const { dni } = req.query;
    if (dni) return buscarPorDni(req, res);
    return listarResponsables(req, res);
});

// GET /api/responsables/:id_responsable/ninos -> lista los niños asociados
router.get('/:id_responsable/ninos', listarNinosDeResponsable);

// PUT /api/responsables/:id_responsable -> actualizar responsable
router.put('/:id_responsable', actualizarResponsable);

// DELETE /api/responsables/:id_responsable -> borrado lógico (activo=false)
router.delete('/:id_responsable', eliminarResponsable);

module.exports = router;
