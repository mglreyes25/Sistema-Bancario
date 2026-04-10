const prisma = require('../prisma');

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Inicio y fin del día para una fecha dada (UTC) */
const rangoDia = (fecha = new Date()) => {
  const inicio = new Date(fecha);
  inicio.setUTCHours(0, 0, 0, 0);
  const fin = new Date(fecha);
  fin.setUTCHours(23, 59, 59, 999);
  return { inicio, fin };
};

// ─── DEPÓSITO ────────────────────────────────────────────────────────────────
// POST /api/transacciones/deposito
// Body: { cuentaId, monto, justificacion? }
const deposito = async (req, res, next) => {
  try {
    const { cuentaId, monto, justificacion } = req.body;

    // Validaciones básicas
    if (!cuentaId || !monto) return res.status(400).json({ error: 'cuentaId y monto son requeridos' });
    if (Number(monto) <= 0) return res.status(400).json({ error: 'Monto debe ser positivo' });

    // Justificación obligatoria si monto >= $1000
    if (Number(monto) >= 1000 && !justificacion) {
      return res.status(400).json({ error: 'Depósitos >= $1000 requieren justificación' });
    }

    const cuenta = await prisma.cuenta.findUnique({ where: { id: cuentaId } });
    if (!cuenta) return res.status(404).json({ error: 'Cuenta no encontrada' });

    const nuevoSaldo = Number(cuenta.saldo) + Number(monto);

    // Transacción atómica: actualizar saldo + registrar movimiento
    const [, tx] = await prisma.$transaction([
      prisma.cuenta.update({
        where: { id: cuentaId },
        data:  { saldo: nuevoSaldo }
      }),
      prisma.transaccion.create({
        data: {
          cuentaId,
          tipo:            'deposito',
          monto:           Number(monto),
          justificacion:   justificacion || null,
          comision:        0,
          saldoResultante: nuevoSaldo
        }
      })
    ]);

    res.status(201).json({ mensaje: 'Depósito exitoso', transaccion: tx, saldoActual: nuevoSaldo });
  } catch (e) { next(e); }
};

// ─── RETIRO ──────────────────────────────────────────────────────────────────
// POST /api/transacciones/retiro
// Body: { cuentaId, monto }
const retiro = async (req, res, next) => {
  try {
    const { cuentaId, monto } = req.body;

    if (!cuentaId || !monto) return res.status(400).json({ error: 'cuentaId y monto son requeridos' });
    if (Number(monto) <= 0)  return res.status(400).json({ error: 'Monto debe ser positivo' });

    const cuenta = await prisma.cuenta.findUnique({ where: { id: cuentaId } });
    if (!cuenta) return res.status(404).json({ error: 'Cuenta no encontrada' });

    // Validar saldo disponible (antes de comisión)
    if (Number(monto) > Number(cuenta.saldo)) {
      return res.status(400).json({ error: 'Saldo insuficiente' });
    }

    // Contar retiros del día para determinar comisión
    const { inicio, fin } = rangoDia();
    const retirosHoy = await prisma.transaccion.count({
      where: {
        cuentaId,
        tipo:  'retiro',
        fecha: { gte: inicio, lte: fin }
      }
    });

    // Acumulado retirado hoy
    const acumuladoHoy = await prisma.transaccion.aggregate({
      _sum: { monto: true },
      where: { cuentaId, tipo: 'retiro', fecha: { gte: inicio, lte: fin } }
    });
    const totalRetiradoHoy = Number(acumuladoHoy._sum.monto || 0);

    // Límite diario $1000
    if (totalRetiradoHoy + Number(monto) > 1000) {
      return res.status(400).json({
        error: `Límite diario de $1000 excedido. Ya retiraste $${totalRetiradoHoy} hoy.`
      });
    }

    // Comisión: $1 desde el segundo retiro del día
    const comision = retirosHoy >= 1 ? 1 : 0;
    const totalDescontar = Number(monto) + comision;

    if (totalDescontar > Number(cuenta.saldo)) {
      return res.status(400).json({ error: 'Saldo insuficiente para cubrir monto + comisión ($1)' });
    }

    const nuevoSaldo = Number(cuenta.saldo) - totalDescontar;

    const [, tx] = await prisma.$transaction([
      prisma.cuenta.update({
        where: { id: cuentaId },
        data:  { saldo: nuevoSaldo }
      }),
      prisma.transaccion.create({
        data: {
          cuentaId,
          tipo:            'retiro',
          monto:           Number(monto),
          comision,
          saldoResultante: nuevoSaldo
        }
      })
    ]);

    res.status(201).json({
      mensaje:     comision > 0 ? `Retiro exitoso. Se cobró comisión de $${comision}` : 'Retiro exitoso',
      transaccion: tx,
      comision,
      saldoActual: nuevoSaldo
    });
  } catch (e) { next(e); }
};

module.exports = { deposito, retiro };
