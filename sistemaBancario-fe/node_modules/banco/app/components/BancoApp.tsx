"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Cuenta, EstadoMensualResponse } from "@/lib/types";
import {
  crearCuenta,
  depositar,
  estadoMensual,
  listarCuentas,
  obtenerCuenta,
  retirar,
} from "@/lib/api";

function num(v: string | number): number {
  return typeof v === "number" ? v : Number(v);
}

function formatMoney(v: string | number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(num(v));
}

export default function BancoApp() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [cuentaDetalle, setCuentaDetalle] = useState<Cuenta | null>(null);
  const [estado, setEstado] = useState<EstadoMensualResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [nuevoTitular, setNuevoTitular] = useState("");
  const [nuevoSaldo, setNuevoSaldo] = useState("0");

  const [depMonto, setDepMonto] = useState("");
  const [depJust, setDepJust] = useState("");

  const [retMonto, setRetMonto] = useState("");

  const now = useMemo(() => new Date(), []);
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());

  const refreshList = useCallback(async () => {
    const list = await listarCuentas();
    setCuentas(list);
    return list;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setErr(null);
        await refreshList();
      } catch (e) {
        if (!cancelled)
          setErr(e instanceof Error ? e.message : "Error al cargar cuentas");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshList]);

  useEffect(() => {
    if (!selectedId) {
      setCuentaDetalle(null);
      setEstado(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setErr(null);
        const [c, e] = await Promise.all([
          obtenerCuenta(selectedId),
          estadoMensual(selectedId, mes, anio),
        ]);
        if (!cancelled) {
          setCuentaDetalle(c);
          setEstado(e);
        }
      } catch (e) {
        if (!cancelled)
          setErr(e instanceof Error ? e.message : "Error al cargar cuenta");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, mes, anio]);

  async function onCrearCuenta(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    setLoading(true);
    try {
      const saldoInicial = Number(nuevoSaldo);
      if (Number.isNaN(saldoInicial) || saldoInicial < 0) {
        setErr("Saldo inicial inválido");
        return;
      }
      const c = await crearCuenta({
        nombreTitular: nuevoTitular.trim(),
        saldoInicial,
      });
      setNuevoTitular("");
      setNuevoSaldo("0");
      setMsg(`Cuenta creada para ${c.nombreTitular}`);
      const list = await refreshList();
      setSelectedId(c.id);
      if (!list.find((x) => x.id === c.id)) await refreshList();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al crear");
    } finally {
      setLoading(false);
    }
  }

  async function onDeposito(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setMsg(null);
    setErr(null);
    const m = Number(depMonto);
    if (Number.isNaN(m) || m <= 0) {
      setErr("Monto de depósito inválido");
      return;
    }
    if (m >= 1000 && !depJust.trim()) {
      setErr("Depósitos ≥ $1000 requieren justificación");
      return;
    }
    setLoading(true);
    try {
      const r = await depositar({
        cuentaId: selectedId,
        monto: m,
        justificacion: depJust.trim() || undefined,
      });
      setDepMonto("");
      setDepJust("");
      setMsg(r.mensaje);
      const c = await obtenerCuenta(selectedId);
      setCuentaDetalle(c);
      await refreshList();
      setEstado(await estadoMensual(selectedId, mes, anio));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error en depósito");
    } finally {
      setLoading(false);
    }
  }

  async function onRetiro(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setMsg(null);
    setErr(null);
    const m = Number(retMonto);
    if (Number.isNaN(m) || m <= 0) {
      setErr("Monto de retiro inválido");
      return;
    }
    setLoading(true);
    try {
      const r = await retirar({ cuentaId: selectedId, monto: m });
      setRetMonto("");
      setMsg(r.mensaje);
      const c = await obtenerCuenta(selectedId);
      setCuentaDetalle(c);
      await refreshList();
      setEstado(await estadoMensual(selectedId, mes, anio));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error en retiro");
    } finally {
      setLoading(false);
    }
  }

  async function recargarEstado() {
    if (!selectedId) return;
    setErr(null);
    try {
      setEstado(await estadoMensual(selectedId, mes, anio));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al cargar estado");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
      <header className="border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <h1 className="text-2xl font-semibold tracking-tight">
          Sistema bancario
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Cuentas, depósitos, retiros y estado de cuenta mensual (API Express +
          Prisma).
        </p>
      </header>

      {(err || msg) && (
        <div className="flex flex-col gap-2 text-sm">
          {err && (
            <p
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
              role="alert"
            >
              {err}
            </p>
          )}
          {msg && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
              {msg}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-medium">Cuentas</h2>
          <form onSubmit={onCrearCuenta} className="flex flex-col gap-3">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nuevo titular
              <input
                required
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                value={nuevoTitular}
                onChange={(e) => setNuevoTitular(e.target.value)}
                placeholder="Nombre completo"
              />
            </label>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Saldo inicial
              <input
                type="number"
                min={0}
                step="0.01"
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                value={nuevoSaldo}
                onChange={(e) => setNuevoSaldo(e.target.value)}
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Crear cuenta
            </button>
          </form>

          <div className="mt-2">
            <p className="mb-2 text-sm text-zinc-500">Seleccionar cuenta</p>
            <select
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setMsg(null);
                setErr(null);
              }}
            >
              <option value="">— Elegir —</option>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombreTitular} · {formatMoney(c.saldo)}
                </option>
              ))}
            </select>
          </div>

          {cuentaDetalle && (
            <div className="mt-2 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
              <p className="font-medium">{cuentaDetalle.nombreTitular}</p>
              <p className="text-zinc-600 dark:text-zinc-400">
                Saldo actual:{" "}
                <span className="font-mono text-zinc-900 dark:text-zinc-100">
                  {formatMoney(cuentaDetalle.saldo)}
                </span>
              </p>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-medium">Operaciones</h2>
          {!selectedId ? (
            <p className="text-sm text-zinc-500">Selecciona una cuenta primero.</p>
          ) : (
            <>
              <form onSubmit={onDeposito} className="flex flex-col gap-2 border-b border-zinc-100 pb-4 dark:border-zinc-800">
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Depósito
                </h3>
                <label className="text-xs text-zinc-600 dark:text-zinc-400">
                  Monto
                  <input
                    type="number"
                    min={0.01}
                    step="0.01"
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                    value={depMonto}
                    onChange={(e) => setDepMonto(e.target.value)}
                    placeholder="0.00"
                  />
                </label>
                <label className="text-xs text-zinc-600 dark:text-zinc-400">
                  Justificación (obligatoria si monto ≥ 1000)
                  <input
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                    value={depJust}
                    onChange={(e) => setDepJust(e.target.value)}
                    placeholder="Motivo del depósito"
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  Depositar
                </button>
              </form>

              <form onSubmit={onRetiro} className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Retiro
                </h3>
                <p className="text-xs text-zinc-500">
                  Límite $1000 retirados por día; desde el 2.º retiro del día,
                  comisión $1.
                </p>
                <label className="text-xs text-zinc-600 dark:text-zinc-400">
                  Monto
                  <input
                    type="number"
                    min={0.01}
                    step="0.01"
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                    value={retMonto}
                    onChange={(e) => setRetMonto(e.target.value)}
                    placeholder="0.00"
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  Retirar
                </button>
              </form>
            </>
          )}
        </section>
      </div>

      {selectedId && estado && (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-4 flex flex-wrap items-end gap-4">
            <h2 className="text-lg font-medium">Estado de cuenta</h2>
            <div className="flex flex-wrap gap-2">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                Mes
                <select
                  className="ml-1 rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
                  value={mes}
                  onChange={(e) => setMes(Number(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                Año
                <input
                  type="number"
                  min={2000}
                  max={2100}
                  className="ml-1 w-24 rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
                  value={anio}
                  onChange={(e) => setAnio(Number(e.target.value))}
                />
              </label>
              <button
                type="button"
                onClick={() => void recargarEstado()}
                className="rounded-lg border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-900"
              >
                Actualizar
              </button>
            </div>
          </div>

          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            {estado.cuenta.titular} · Período {estado.cuenta.periodo}
          </p>

          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
              <p className="text-zinc-500">Saldo inicial</p>
              <p className="font-mono font-medium">
                {formatMoney(estado.global.saldoInicial)}
              </p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
              <p className="text-zinc-500">Saldo final</p>
              <p className="font-mono font-medium">
                {formatMoney(estado.global.saldoFinal)}
              </p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
              <p className="text-zinc-500">Depósitos / Retiros / Comisiones</p>
              <p className="font-mono text-xs leading-relaxed">
                +{formatMoney(estado.resumen.totalDepositos)} / −
                {formatMoney(estado.resumen.totalRetiros)} / −
                {formatMoney(estado.resumen.totalComisiones)}
              </p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
              <p className="text-zinc-500">Movimientos</p>
              <p className="font-mono font-medium">
                {estado.global.totalMovimientos}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="py-2 pr-3 font-medium">Fecha</th>
                  <th className="py-2 pr-3 font-medium">Tipo</th>
                  <th className="py-2 pr-3 font-medium">Monto</th>
                  <th className="py-2 pr-3 font-medium">Comisión</th>
                  <th className="py-2 pr-3 font-medium">Saldo resultante</th>
                  <th className="py-2 font-medium">Justificación</th>
                </tr>
              </thead>
              <tbody>
                {estado.transacciones.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-6 text-center text-zinc-500"
                    >
                      Sin movimientos en este período.
                    </td>
                  </tr>
                ) : (
                  estado.transacciones.map((t, i) => (
                    <tr
                      key={`${t.fecha}-${i}`}
                      className="border-b border-zinc-100 dark:border-zinc-800"
                    >
                      <td className="py-2 pr-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                        {new Date(t.fecha).toLocaleString("es-AR")}
                      </td>
                      <td className="py-2 pr-3 capitalize">{t.tipo}</td>
                      <td className="py-2 pr-3 font-mono">
                        {formatMoney(t.monto)}
                      </td>
                      <td className="py-2 pr-3 font-mono">
                        {formatMoney(t.comision)}
                      </td>
                      <td className="py-2 pr-3 font-mono">
                        {formatMoney(t.saldoResultante)}
                      </td>
                      <td className="max-w-[200px] truncate py-2 text-zinc-600 dark:text-zinc-400">
                        {t.justificacion ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
