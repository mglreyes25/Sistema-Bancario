const prisma = require('../prisma');

// POST /api/cuentas  { nombreTitular, saldoInicial }
const crear = async (req, res, next) => {
  try {
    const { nombreTitular, saldoInicial = 0 } = req.body;
    if (!nombreTitular) return res.status(400).json({ error: 'nombreTitular es requerido' });
    if (saldoInicial < 0)  return res.status(400).json({ error: 'Saldo inicial no puede ser negativo' });

    const cuenta = await prisma.cuenta.create({
      data: { nombreTitular, saldo: saldoInicial }
    });
    res.status(201).json(cuenta);
  } catch (e) { next(e); }
};

// GET /api/cuentas
const listar = async (req, res, next) => {
  try {
    const cuentas = await prisma.cuenta.findMany({ orderBy: { creadaEn: 'desc' } });
    res.json(cuentas);
  } catch (e) { next(e); }
};

// GET /api/cuentas/:id  → muestra saldo actualizado
const obtener = async (req, res, next) => {
  try {
    const cuenta = await prisma.cuenta.findUnique({ where: { id: req.params.id } });
    if (!cuenta) return res.status(404).json({ error: 'Cuenta no encontrada' });
    res.json(cuenta);
  } catch (e) { next(e); }
};

module.exports = { crear, listar, obtener };
