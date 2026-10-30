import { formatearFecha, formatearImporte, type Pago, type Viaje } from "@rumbo/shared";
import { useAnularPago, useDividirPago, useReprogramarPago } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mensajeDeError } from "@/lib/errores";
import { aCentesimas } from "../calculos";
import { DECIMAL } from "../esquemas";
import { ETIQUETA_TIPO_PAGO } from "./etiquetas";

export type AccionDePago = { tipo: "reprogramar" | "anular" | "dividir"; pago: Pago };

/**
 * Panel de la acción elegida sobre un pago sin cobrar (CU-11): reprogramar (RF-065), anular
 * (RF-066) o dividir (A6). Las reglas las aplica la API; acá se valida solo el formato.
 */
export function PanelDePago({
  cliente,
  viaje,
  accion: { tipo, pago },
  cerrar,
}: {
  cliente: AxiosInstance;
  viaje: Viaje;
  accion: AccionDePago;
  cerrar: () => void;
}) {
  const reprogramar = useReprogramarPago(cliente);
  const anular = useAnularPago(cliente);
  const dividir = useDividirPago(cliente);
  const [fecha, setFecha] = useState("");
  const [montoAhora, setMontoAhora] = useState("");
  const [error, setError] = useState<string | null>(null);
  const enCurso = reprogramar.isPending || anular.isPending || dividir.isPending;
  const descripcion = `${ETIQUETA_TIPO_PAGO[pago.tipo].toLowerCase()} de ${formatearImporte(pago.monto, viaje.moneda)} del ${formatearFecha(pago.vencimiento)}`;
  const titulo = {
    anular: `¿Anular la ${descripcion}?`,
    reprogramar: `Reprogramar la ${descripcion}`,
    dividir: `Dividir la ${descripcion}`,
  }[tipo];

  async function confirmar() {
    setError(null);
    try {
      if (tipo === "anular") {
        await anular.mutateAsync(pago.id);
      } else if (tipo === "reprogramar") {
        if (fecha === "") { setError("Elegí el nuevo vencimiento."); return; }
        await reprogramar.mutateAsync({ pagoId: pago.id, datos: { vencimiento: fecha } });
      } else {
        const importe = montoAhora.trim();
        if (!DECIMAL.test(importe) || fecha === "") {
          setError("Completá el monto de ahora y el vencimiento del resto."); return;
        }
        if (aCentesimas(importe) <= 0n || aCentesimas(importe) >= aCentesimas(pago.monto)) {
          setError(
            "El monto de ahora tiene que ser mayor que cero y menor que el del pago.",
          ); return;
        }
        await dividir.mutateAsync({
          pagoId: pago.id,
          datos: { monto_ahora: importe, vencimiento_resto: fecha },
        });
      }
      cerrar();
    } catch (falla) {
      setError(mensajeDeError(falla));
    }
  }

  return (
    <form
      aria-label={titulo}
      className="flex flex-col gap-3 rounded-xl border bg-background p-4"
      onSubmit={(evento) => {
        evento.preventDefault();
        void confirmar();
      }}
    >
      <p className="text-sm font-medium text-foreground">{titulo}</p>
      {error && (
        <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      )}
      {tipo === "dividir" && (
        <div className="flex flex-col gap-1">
          <Label htmlFor="monto-ahora">Monto de ahora</Label>
          <Input
            id="monto-ahora"
            inputMode="decimal"
            value={montoAhora}
            onChange={(evento) => {
              setMontoAhora(evento.target.value);
            }}
          />
        </div>
      )}
      {tipo !== "anular" && (
        <div className="flex flex-col gap-1">
          <Label htmlFor="fecha-accion">
            {tipo === "dividir" ? "Vencimiento del resto" : "Nuevo vencimiento"}
          </Label>
          <Input
            id="fecha-accion"
            type="date"
            value={fecha}
            onChange={(evento) => {
              setFecha(evento.target.value);
            }}
          />
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={enCurso}>
          Confirmar
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={cerrar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
