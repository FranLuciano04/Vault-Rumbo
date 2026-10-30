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
import { ETIQUETA_TIPO_PAGO, estaSinCobrar } from "./etiquetas";

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
  const puedeGuardar = diferencia === 0n && completo && !definir.isPending;

  function pagoUnico() {
    const pendiente =
      aCentesimas(viaje.precio_venta) - cobrados.reduce((t, p) => t + aCentesimas(p.monto), 0n);
    setFilas([
      {
        clave: "unico",
        tipo: "saldo",
        monto: deCentesimas(pendiente),
        vencimiento: ultimoVencimiento,
      },
    ]);
  }

  function agregarCuota() {
    const saldo = filas.findIndex((f) => f.tipo === "saldo");
    const nueva: Fila = {
      clave: crypto.randomUUID(),
      tipo: "cuota",
      monto: "0.00",
      vencimiento: ultimoVencimiento,
    };
    setFilas(
      saldo < 0 ? [...filas, nueva] : [...filas.slice(0, saldo), nueva, ...filas.slice(saldo)],
    );
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
          const nombre = `${ETIQUETA_TIPO_PAGO[fila.tipo].toLowerCase()}${fila.tipo === "cuota" ? ` ${String(i)}` : ""}`;
          return (
            <li key={fila.clave} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor={`monto-${fila.clave}`}>{`Monto de la ${nombre}`}</Label>
                <Input
                  id={`monto-${fila.clave}`}
                  inputMode="decimal"
                  value={fila.monto}
                  aria-invalid={centesimasDe(fila.monto) === null}
                  onChange={(evento) => {
                    cambiar(fila.clave, { monto: evento.target.value });
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`vencimiento-${fila.clave}`}>{`Vencimiento de la ${nombre}`}</Label>
                <Input
                  id={`vencimiento-${fila.clave}`}
                  type="date"
                  value={fila.vencimiento}
                  onChange={(evento) => {
                    cambiar(fila.clave, { vencimiento: evento.target.value });
                  }}
                />
              </div>
              {fila.tipo === "cuota" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`Quitar la ${nombre}`}
                  onClick={() => {
                    setFilas(filas.filter((f) => f.clave !== fila.clave));
                  }}
                >
                  Quitar
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {diferencia === null ? (
        <p className="text-sm text-destructive">Revisá los importes: hay alguno inválido.</p>
      ) : (
        diferencia !== 0n && (
          <p className="text-sm text-destructive">
            {`Diferencia con el precio de venta: ${formatearImporte(deCentesimas(diferencia < 0n ? -diferencia : diferencia), viaje.moneda)} (${diferencia > 0n ? "faltan" : "sobran"})`}
          </p>
        )
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={agregarCuota}>
          Agregar cuota
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={pagoUnico}>
          Pago único
        </Button>
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
