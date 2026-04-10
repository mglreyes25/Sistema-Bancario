const router = require('express').Router();
const ctrl   = require('../controllers/estado');

// GET /api/estado/:cuentaId?mes=4&anio=2026
router.get('/:cuentaId', ctrl.estadoMensual);

module.exports = router;
