import { zodResolver } from "@hookform/resolvers/zod";
import {
  formatearImporte,
  hoyEnBuenosAires,
  type Moneda,
  type Pago,
  type Viaje,
} from "@rumbo/shared";
import { useCancelarViaje, usePagos } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { aplicarErroresDelServidor } from "@/lib/errores";
import { aCentesimas, deCentesimas } from "./calculos";
import { estaSinCobrar } from "./plan/etiquetas";

const esquemaCancelacion = z.object({
  motivo_cancelacion: z.string().trim().min(1, "Ingresá el motivo de la cancelación."),
  fecha_cancelacion: z.string().min(1, "Ingresá la fecha de cancelación."),
});
type DatosCancelacion = z.infer<typeof esquemaCancelacion>;

/** Suma de lo cobrado por moneda de cobro, en centésimas enteras (nunca float). */
function totalesCobrados(pagos: Pago[]): [Moneda, string][] {
  const centesimas = new Map<Moneda, bigint>();
  for (const { estado, monto_cobrado, moneda_pago } of pagos) {
    if (estado !== "pagado" || !monto_cobrado || !moneda_pago) continue;
    centesimas.set(moneda_pago, (centesimas.get(moneda_pago) ?? 0n) + aCentesimas(monto_cobrado));
  }
  return [...centesimas].map(([moneda, total]) => [moneda, deCentesimas(total)]);
}

/** Pagos que la cancelación anula (CU-27 paso 5) y su total, en la moneda del viaje. */
function pagosPorAnular(pagos: Pago[], moneda: Moneda) {
  const sinCobrar = pagos.filter((pago) => estaSinCobrar(pago.estado));
  const total = sinCobrar.reduce((suma, pago) => suma + aCentesimas(pago.monto), 0n);
  return { cantidad: sinCobrar.length, total: formatearImporte(deCentesimas(total), moneda) };
}

/** Lo que pasa al confirmar (pantalla 19, «Al cancelar»); la comisión se mantiene si ya salió (A4). */
function AlCancelar({ viaje, pagos }: { viaje: Viaje; pagos: Pago[] | undefined }) {
  const { cantidad, total } = pagosPorAnular(pagos ?? [], viaje.moneda);
  return (
    <section aria-label="Al cancelar" className="rounded-xl border p-4">
      <h4 className="mb-2 text-xs font-medium uppercase text-muted-foreground">Al cancelar</h4>
      <ul className="flex flex-col gap-1 text-sm">
        <li>El viaje pasa a «cancelado» y queda en el historial.</li>
        {cantidad > 0 && (
          <li>
            {cantidad === 1
              ? `El pago no cobrado (${total}) pasa`
              : `Los ${String(cantidad)} pagos no cobrados (${total}) pasan`}{" "}
            a «anulado».
          </li>
        )}
        <li>Se cierran las alertas vigentes del viaje.</li>
        <li>
          {viaje.estado === "en_curso"
            ? "La comisión del vendedor se mantiene, porque el viaje ya salió."
            : "La comisión proyectada del vendedor no se realiza."}
        </li>
      </ul>
    </section>
  );
}

/** Aviso de los cobros ya registrados: Rumbo no gestiona reembolsos ni penalidades (CU-27, A2). */
function AvisoDeCobros({ pagos, falla }: { pagos: Pago[] | undefined; falla: boolean }) {
  if (falla) {
    return <p role="status">No pudimos cargar los cobros registrados.</p>;
  }
  const totales = pagos ? totalesCobrados(pagos) : [];
  if (totales.length === 0) return null;
  return (
    <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Ya se cobraron {totales.map(([moneda, total]) => formatearImporte(total, moneda)).join(" y ")}
      . Cualquier reembolso o penalidad se gestiona por fuera de Rumbo.
    </p>
  );
}

/**
 * Diálogo para cancelar el viaje (CU-27, RF-048, pantalla 19): pide motivo y fecha, avisa de los
 * cobros registrados y de que la cancelación se puede revertir. El servidor decide si corresponde.
 */
export function CancelarViaje({
  cliente,
  viaje,
  cerrar,
}: {
  cliente: AxiosInstance;
  viaje: Viaje;
  cerrar: () => void;
}) {
  const cancelar = useCancelarViaje(cliente);
  const pagos = usePagos(cliente, viaje.id);
  const [aviso, setAviso] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState } = useForm<DatosCancelacion>({
    resolver: zodResolver(esquemaCancelacion),
    defaultValues: { motivo_cancelacion: "", fecha_cancelacion: hoyEnBuenosAires() },
  });
  const { errors, isSubmitting } = formState;
  const mensaje = aviso ?? errors.motivo_cancelacion?.message ?? errors.fecha_cancelacion?.message;

  async function confirmar(datos: DatosCancelacion) {
    setAviso(null);
    try {
      await cancelar.mutateAsync({ viajeId: viaje.id, datos });
      cerrar();
    } catch (falla) {
      setAviso(
        aplicarErroresDelServidor(falla, ["motivo_cancelacion", "fecha_cancelacion"], setError),
      );
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Cancelar viaje"
      className="flex flex-col gap-3 rounded-xl border bg-background p-4"
      onKeyDown={(evento) => {
        if (evento.key === "Escape" && !isSubmitting) cerrar();
      }}
    >
      <h3 className="text-base font-medium text-foreground">¿Cancelar el viaje?</h3>
      <AlCancelar viaje={viaje} pagos={pagos.data} />
      <AvisoDeCobros pagos={pagos.data} falla={pagos.isError} />
      <form
        noValidate
        className="flex flex-col gap-3"
        onSubmit={(evento) => void handleSubmit(confirmar)(evento)}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="cancelacion-motivo">Motivo de la cancelación</Label>
          <Textarea
            id="cancelacion-motivo"
            aria-invalid={Boolean(errors.motivo_cancelacion)}
            {...register("motivo_cancelacion")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cancelacion-fecha">Fecha de cancelación</Label>
          <Input
            id="cancelacion-fecha"
            type="date"
            aria-invalid={Boolean(errors.fecha_cancelacion)}
            {...register("fecha_cancelacion")}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Si fue un error, se puede revertir la cancelación después.
        </p>
        {mensaje && (
          <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {mensaje}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isSubmitting}>
            Cancelar viaje
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={isSubmitting} onClick={cerrar}>
            Volver
          </Button>
        </div>
      </form>
    </div>
  );
}
