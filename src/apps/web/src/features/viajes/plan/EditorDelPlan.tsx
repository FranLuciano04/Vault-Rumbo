import { formatearImporte, type Pago, type TipoPago, type Viaje } from "@rumbo/shared";
import { useDefinirPlanDePagos } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mensajeDeError } from "@/lib/errores";
import { aCentesimas, deCentesimas } from "../calculos";
import { DECIMAL } from "../esquemas";
import { estaSinCobrar, nombreDePago } from "./etiquetas";

type Fila = { clave: string; tipo: TipoPago; monto: string; vencimiento: string };

const filaDe = (pago: Pago): Fila => ({
  clave: pago.id,
  tipo: pago.tipo,
  monto: pago.monto,
  vencimiento: pago.vencimiento,
});

/** Importe de la fila en centésimas; `null` si lo escrito no es un importe válido. */
const centesimasDe = (monto: string) =>
  DECIMAL.test(monto.trim()) ? aCentesimas(monto.trim()) : null;

/**
 * Editor del plan (CU-11): los pagos sin cobrar se editan; los cobrados cuentan en la suma pero no
 * se tocan. La suma tiene que igualar el precio de venta para guardar (RF-061).
 */
export function EditorDelPlan({
  cliente,
  viaje,
  pagos,
  cerrar,
}: {
  cliente: AxiosInstance;
  viaje: Viaje;
  /** Los pagos del viaje, ordenados por vencimiento. */
  pagos: Pago[];
  cerrar: () => void;
}) {
  const definir = useDefinirPlanDePagos(cliente);
  const cobrados = pagos.filter((p) => p.estado === "pagado");
  const [filas, setFilas] = useState<Fila[]>(
    pagos.filter((p) => estaSinCobrar(p.estado)).map(filaDe),
  );
  const [error, setError] = useState<string | null>(null);

  const cambiar = (clave: string, cambios: Partial<Fila>) => {
    setFilas(filas.map((f) => (f.clave === clave ? { ...f, ...cambios } : f)));
  };
  const ultimoVencimiento = filas.at(-1)?.vencimiento ?? "";

  const importes = filas.map((f) => centesimasDe(f.monto));
  const suma = [...cobrados.map((p) => centesimasDe(p.monto)), ...importes].reduce<bigint | null>(
    (total, importe) => (total === null || importe === null ? null : total + importe),
    0n,
  );
  const diferencia = suma === null ? null : aCentesimas(viaje.precio_venta) - suma;
  const completo = filas.every((f) => f.vencimiento !== "");
  const montosPositivos = importes.every((importe) => importe !== null && importe > 0n);
  const puedeGuardar =
    filas.length > 0 && montosPositivos && diferencia === 0n && completo && !definir.isPending;
  const pendiente =
    aCentesimas(viaje.precio_venta) - cobrados.reduce((t, p) => t + aCentesimas(p.monto), 0n);
  const hay = (tipo: TipoPago) => [...cobrados, ...filas].some((f) => f.tipo === tipo);

  function pagoUnico() {
    setFilas([
      {
        clave: "unico",
        tipo: "saldo",
        monto: deCentesimas(pendiente),
        vencimiento: ultimoVencimiento,
      },
    ]);
  }

  /** La seña va al principio, el saldo al final y las cuotas antes del saldo. */
  function agregar(tipo: TipoPago) {
    const nueva: Fila = {
      clave: crypto.randomUUID(),
      tipo,
      monto: "0.00",
      vencimiento: ultimoVencimiento,
    };
    const saldo = filas.findIndex((f) => f.tipo === "saldo");
    if (tipo === "sena") setFilas([nueva, ...filas]);
    else if (tipo === "cuota" && saldo >= 0) {
      setFilas([...filas.slice(0, saldo), nueva, ...filas.slice(saldo)]);
    } else setFilas([...filas, nueva]);
  }

  async function guardar() {
    setError(null);
    try {
      await definir.mutateAsync({
        viajeId: viaje.id,
        datos: {
          pagos: filas.map(({ tipo, monto, vencimiento }) => ({
            tipo,
            monto: monto.trim(),
            vencimiento,
          })),
        },
      });
      cerrar();
    } catch (falla) {
      setError(mensajeDeError(falla));
    }
  }

  return (
    <form
      aria-label="Editor del plan de pagos"
      className="flex flex-col gap-3"
      onSubmit={(evento) => {
        evento.preventDefault();
        if (puedeGuardar) void guardar();
      }}
    >
      {error && (
        <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {filas.map((fila, i) => {
          const cuotasCobradas = cobrados.filter((p) => p.tipo === "cuota").length;
          const numeroDeCuota =
            cuotasCobradas + filas.slice(0, i + 1).filter((f) => f.tipo === "cuota").length;
          const nombre = nombreDePago(fila.tipo, numeroDeCuota);
          const deNombre = nombre.replace(/^el /, "del ").replace(/^la /, "de la ");
          return (
            <li key={fila.clave} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor={`monto-${fila.clave}`}>{`Monto ${deNombre}`}</Label>
                <Input
                  id={`monto-${fila.clave}`}
                  inputMode="decimal"
                  value={fila.monto}
                  aria-invalid={!((centesimasDe(fila.monto) ?? 0n) > 0n)}
                  onChange={(evento) => {
                    cambiar(fila.clave, { monto: evento.target.value });
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`vencimiento-${fila.clave}`}>{`Vencimiento ${deNombre}`}</Label>
                <Input
                  id={`vencimiento-${fila.clave}`}
                  type="date"
                  value={fila.vencimiento}
                  onChange={(evento) => {
                    cambiar(fila.clave, { vencimiento: evento.target.value });
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Quitar ${nombre}`}
                onClick={() => {
                  setFilas(filas.filter((f) => f.clave !== fila.clave));
                }}
              >
                Quitar
              </Button>
            </li>
          );
        })}
      </ul>

      {diferencia === null ? (
        <p className="text-sm text-destructive">Revisá los importes: hay alguno inválido.</p>
      ) : diferencia !== 0n ? (
        <p className="text-sm text-destructive">
          {`Diferencia con el precio de venta: ${formatearImporte(deCentesimas(diferencia < 0n ? -diferencia : diferencia), viaje.moneda)} (${diferencia > 0n ? "faltan" : "sobran"})`}
        </p>
      ) : !montosPositivos ? (
        <p className="text-sm text-destructive">Cada pago tiene que ser mayor que cero.</p>
      ) : (
        filas.length > 0 && (
          <p role="status" className="text-sm text-emerald-700">
            La suma de los pagos coincide con el precio de venta.
          </p>
        )
      )}
      {pendiente <= 0n && (
        <p className="text-sm text-muted-foreground">No queda saldo por planificar.</p>
      )}

      <div className="flex flex-wrap gap-2">
        {!hay("sena") && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              agregar("sena");
            }}
          >
            Agregar seña
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            agregar("cuota");
          }}
        >
          Agregar cuota
        </Button>
        {!hay("saldo") && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              agregar("saldo");
            }}
          >
            Agregar saldo
          </Button>
        )}
        {pendiente > 0n && (
          <Button type="button" variant="outline" size="sm" onClick={pagoUnico}>
            Pago único
          </Button>
        )}
        <Button type="submit" size="sm" disabled={!puedeGuardar}>
          Guardar plan
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={cerrar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
