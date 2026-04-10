const prisma = require('../prisma');

// GET /api/estado/:cuentaId?mes=4&anio=2026
const estadoMensual = async (req, res, next) => {
  try {
    const { cuentaId } = req.params;
    const mes  = parseInt(req.query.mes  || new Date().getMonth() + 1);
    const anio = parseInt(req.query.anio || new Date().getFullYear());

    const cuenta = await prisma.cuenta.findUnique({ where: { id: cuentaId } });
    if (!cuenta) return res.status(404).json({ error: 'Cuenta no encontrada' });

    // Rango del mes seleccionado
    const inicio = new Date(anio, mes - 1, 1);
    const fin    = new Date(anio, mes, 0, 23, 59, 59, 999);

    // Todas las transacciones del período
    const transacciones = await prisma.transaccion.findMany({
      where: { cuentaId, fecha: { gte: inicio, lte: fin } },
      orderBy: { fecha: 'asc' }
    });

    // Resumen detallado
    const totalDepositos  = transacciones
      .filter(t => t.tipo === 'deposito')
      .reduce((s, t) => s + Number(t.monto), 0);

    const totalRetiros    = transacciones
      .filter(t => t.tipo === 'retiro')
      .reduce((s, t) => s + Number(t.monto), 0);

    const totalComisiones = transacciones
      .reduce((s, t) => s + Number(t.comision), 0);

    // Saldo inicial del mes = saldo_resultante del último movimiento ANTES del mes
    const txAnterior = await prisma.transaccion.findFirst({
      where:   { cuentaId, fecha: { lt: inicio } },
      orderBy: { fecha: 'desc' }
    });
    const saldoInicialMes = txAnterior
      ? Number(txAnterior.saldoResultante)
      : Number(cuenta.saldo) - totalDepositos + totalRetiros + totalComisiones;

    const saldoFinalMes   = transacciones.length > 0
      ? Number(transacciones[transacciones.length - 1].saldoResultante)
      : saldoInicialMes;

    res.json({
      // Encabezado
      cuenta: {
        id:           cuenta.id,
        titular:      cuenta.nombreTitular,
        periodo:      `${mes.toString().padStart(2,'0')}/${anio}`
      },

      // Detalle de transacciones
      transacciones: transacciones.map(t => ({
        fecha:          t.fecha,
        tipo:           t.tipo,
        monto:          Number(t.monto),
        justificacion:  t.justificacion,
        comision:       Number(t.comision),
        saldoResultante: Number(t.saldoResultante)
      })),

      // Resumen detallado
      resumen: {
        totalDepositos:  parseFloat(totalDepositos.toFixed(2)),
        totalRetiros:    parseFloat(totalRetiros.toFixed(2)),
        totalComisiones: parseFloat(totalComisiones.toFixed(2))
      },

      // Resumen global
      global: {
        saldoInicial:      parseFloat(saldoInicialMes.toFixed(2)),
        saldoFinal:        parseFloat(saldoFinalMes.toFixed(2)),
        totalMovimientos:  transacciones.length
      }
    });
  } catch (e) { next(e); }
};

module.exports = { estadoMensual };
