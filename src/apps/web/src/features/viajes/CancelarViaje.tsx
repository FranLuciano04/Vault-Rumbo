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

const esquemaCancelacion = z.object({
  motivo_cancelacion: z.string().trim().min(1, "Ingresá el motivo de la cancelación."),
  fecha_cancelacion: z.string().min(1, "Ingresá la fecha de cancelación."),
});
type DatosCancelacion = z.infer<typeof esquemaCancelacion>;

/** Suma de lo cobrado por moneda de cobro, en centavos enteros (nunca float). */
function totalesCobrados(pagos: Pago[]): [Moneda, string][] {
  const centavos = new Map<Moneda, bigint>();
  for (const { estado, monto_cobrado, moneda_pago } of pagos) {
    if (estado !== "pagado" || !monto_cobrado || !moneda_pago) continue;
    const [entero = "0", decimales = ""] = monto_cobrado.split(".");
    const valor = BigInt(`${entero}${decimales.padEnd(2, "0").slice(0, 2)}`);
    centavos.set(moneda_pago, (centavos.get(moneda_pago) ?? 0n) + valor);
  }
  return [...centavos].map(([moneda, total]) => {
    const texto = total.toString().padStart(3, "0");
    return [moneda, `${texto.slice(0, -2)}.${texto.slice(-2)}`];
  });
}

/** Aviso de los cobros ya registrados: Rumbo no gestiona reembolsos ni penalidades (CU-27, A2). */
function AvisoDeCobros({ cliente, viajeId }: { cliente: AxiosInstance; viajeId: string }) {
  const { data: pagos } = usePagos(cliente, viajeId);
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
      <AvisoDeCobros cliente={cliente} viajeId={viaje.id} />
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
