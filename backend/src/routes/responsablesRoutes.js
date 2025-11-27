const express = require('express');
const { buscarPorDni, listarResponsables, crearResponsable, listarNinosDeResponsable, actualizarResponsable, eliminarResponsable } = require('../controllers/responsablesController');
const { authenticate, authorize } = require('../middlewares/auth');
const router = express.Router();

// GET /api/responsables?dni=44028630  -> busca por DNI
router.get('/', authenticate, authorize(['admin', 'recepcion', 'profesional']), async (req, res) => {
    const { dni } = req.query;
    if (dni) return buscarPorDni(req, res);
    return listarResponsables(req, res);
});

// POST /api/responsables -> crear responsable
router.post('/', authenticate, authorize(['admin']), crearResponsable);

// GET /api/responsables/:id_responsable/ninos -> lista los niños asociados
router.get('/:id_responsable/ninos', authenticate, authorize(['admin', 'recepcion', 'profesional']), listarNinosDeResponsable);

// PUT /api/responsables/:id_responsable -> actualizar responsable
router.put('/:id_responsable', authenticate, authorize(['admin']), actualizarResponsable);

// DELETE /api/responsables/:id_responsable -> borrado lógico (activo=false)
router.delete('/:id_responsable', authenticate, authorize(['admin']), eliminarResponsable);

module.exports = router;
