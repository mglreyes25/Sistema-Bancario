const router = require('express').Router();
const ctrl   = require('../controllers/transacciones');

router.post('/deposito', ctrl.deposito);  // Depositar
router.post('/retiro',   ctrl.retiro);    // Retirar

module.exports = router;
