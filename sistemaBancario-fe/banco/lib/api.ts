import type {
  ApiErrorBody,
  Cuenta,
  DepositoResponse,
  EstadoMensualResponse,
  RetiroResponse,
} from "./types";

const API_PREFIX = "/banco-api";

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      throw new Error("Respuesta no válida del servidor");
    }
  }
  if (!res.ok) {
    const err = (data as ApiErrorBody).error ?? res.statusText;
    throw new Error(err);
  }
  return data as T;
}

export async function listarCuentas(): Promise<Cuenta[]> {
  const res = await fetch(`${API_PREFIX}/cuentas`, { cache: "no-store" });
  return parseJson<Cuenta[]>(res);
}

export async function crearCuenta(body: {
  nombreTitular: string;
  saldoInicial?: number;
}): Promise<Cuenta> {
  const res = await fetch(`${API_PREFIX}/cuentas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson<Cuenta>(res);
}

export async function obtenerCuenta(id: string): Promise<Cuenta> {
  const res = await fetch(`${API_PREFIX}/cuentas/${id}`, { cache: "no-store" });
  return parseJson<Cuenta>(res);
}

export async function depositar(body: {
  cuentaId: string;
  monto: number;
  justificacion?: string;
}): Promise<DepositoResponse> {
  const res = await fetch(`${API_PREFIX}/transacciones/deposito`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson<DepositoResponse>(res);
}

export async function retirar(body: {
  cuentaId: string;
  monto: number;
}): Promise<RetiroResponse> {
  const res = await fetch(`${API_PREFIX}/transacciones/retiro`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson<RetiroResponse>(res);
}

export async function estadoMensual(
  cuentaId: string,
  mes: number,
  anio: number
): Promise<EstadoMensualResponse> {
  const q = new URLSearchParams({
    mes: String(mes),
    anio: String(anio),
  });
  const res = await fetch(
    `${API_PREFIX}/estado/${encodeURIComponent(cuentaId)}?${q}`,
    { cache: "no-store" }
  );
  return parseJson<EstadoMensualResponse>(res);
}
