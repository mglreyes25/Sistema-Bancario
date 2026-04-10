/** Alineado con Prisma / respuestas JSON del backend Express */

export type TipoTx = "deposito" | "retiro" | "comision";

export type Cuenta = {
  id: string;
  nombreTitular: string;
  /** Prisma Decimal suele serializarse como string */
  saldo: string | number;
  creadaEn: string;
};

export type Transaccion = {
  id: string;
  cuentaId: string;
  tipo: TipoTx;
  monto: string | number;
  justificacion: string | null;
  comision: string | number;
  saldoResultante: string | number;
  fecha: string;
};

export type DepositoResponse = {
  mensaje: string;
  transaccion: Transaccion;
  saldoActual: number;
};

export type RetiroResponse = {
  mensaje: string;
  transaccion: Transaccion;
  comision: number;
  saldoActual: number;
};

export type EstadoMensualResponse = {
  cuenta: {
    id: string;
    titular: string;
    periodo: string;
  };
  transacciones: Array<{
    fecha: string;
    tipo: TipoTx;
    monto: number;
    justificacion: string | null;
    comision: number;
    saldoResultante: number;
  }>;
  resumen: {
    totalDepositos: number;
    totalRetiros: number;
    totalComisiones: number;
  };
  global: {
    saldoInicial: number;
    saldoFinal: number;
    totalMovimientos: number;
  };
};

export type ApiErrorBody = { error: string };
