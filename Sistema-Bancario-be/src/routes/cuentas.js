const router = require('express').Router();
const ctrl   = require('../controllers/cuentas');

router.post('/',      ctrl.crear);   // Crear cuenta
router.get('/',       ctrl.listar);  // Listar todas
router.get('/:id',    ctrl.obtener); // Obtener por ID (incluye saldo)

module.exports = router;
