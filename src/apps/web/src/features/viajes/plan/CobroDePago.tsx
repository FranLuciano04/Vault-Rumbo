import {
  formatearFecha,
  formatearImporte,
  type FormaPago,
  type Moneda,
  type Pago,
  type Viaje,
} from "@rumbo/shared";
import { useRegistrarCobro } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mensajeDeError } from "@/lib/errores";
import { ETIQUETA_FORMA_PAGO, ETIQUETA_TIPO_PAGO } from "./etiquetas";

const MONEDAS: Moneda[] = ["ARS", "USD"];
const TIPO_DE_CAMBIO = /^\d+(\.\d+)?$/;

/** Monto cobrado en otra moneda que la del viaje: el tipo de cambio son pesos por dólar (CU-12 A0). */
function montoCobrado(monto: string, moneda: Moneda, tipoDeCambio: number) {
  const planificado = Number(monto);
  const cobrado = moneda === "ARS" ? planificado * tipoDeCambio : planificado / tipoDeCambio;
  return cobrado.toFixed(2);
}

function Opciones<T extends string>({
  nombre,
  opciones,
  etiqueta,
  valor,
  elegir,
}: {
  nombre: string;
  opciones: readonly T[];
  etiqueta: (opcion: T) => string;
  valor: T | null;
  elegir: (opcion: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={nombre} className="flex flex-wrap gap-2">
      {opciones.map((opcion) => (
        <Button
          key={opcion}
          type="button"
          role="radio"
          aria-checked={valor === opcion}
          variant={valor === opcion ? "default" : "outline"}
          size="sm"
          onClick={() => {
            elegir(opcion);
          }}
        >
          {etiqueta(opcion)}
        </Button>
      ))}
    </div>
  );
}

/**
 * Diálogo para registrar el cobro de un pago (CU-12, pantalla 18): fecha efectiva, forma de pago
 * (RF-071) y moneda; en otra moneda que la del viaje pide el tipo de cambio (RF-068). El monto
 * cobrado lo calcula la API: acá es solo una vista previa. Valida formato; las reglas, la API.
 */
export function CobroDePago({
  cliente,
  viaje,
  pago,
  cerrar,
}: {
  cliente: AxiosInstance;
  viaje: Viaje;
  pago: Pago;
  cerrar: () => void;
}) {
  const registrar = useRegistrarCobro(cliente);
  const [fecha, setFecha] = useState("");
  const [forma, setForma] = useState<FormaPago | null>(null);
  const [moneda, setMoneda] = useState<Moneda>(viaje.moneda);
  const [tipoDeCambio, setTipoDeCambio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const otraMoneda = moneda !== viaje.moneda;
  const cambio = tipoDeCambio.trim();
  const cambioValido = TIPO_DE_CAMBIO.test(cambio) && Number(cambio) > 0;

  async function confirmar() {
    setError(null);
    if (fecha === "" || forma === null) {
      setError("Elegí la fecha efectiva del cobro y la forma de pago.");
      return;
    }
    if (otraMoneda && !cambioValido) {
      setError("Ingresá el tipo de cambio, mayor que cero.");
      return;
    }
    try {
      await registrar.mutateAsync({
        pagoId: pago.id,
        datos: {
          fecha_cobro: fecha,
          forma_pago: forma,
          moneda_pago: moneda,
          tipo_cambio: otraMoneda ? cambio : null,
        },
      });
      cerrar();
    } catch (falla) {
      setError(mensajeDeError(falla));
    }
  }

  return (
    <form
      role="dialog"
      aria-modal="true"
      aria-label="Registrar cobro"
      className="flex flex-col gap-4 rounded-xl border bg-background p-4"
      onKeyDown={(evento) => {
        if (evento.key === "Escape") cerrar();
      }}
      onSubmit={(evento) => {
        evento.preventDefault();
        void confirmar();
      }}
    >
      <h3 className="text-base font-medium text-foreground">Registrar cobro</h3>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="font-medium">{ETIQUETA_TIPO_PAGO[pago.tipo]}</p>
        <p className="tabular-nums">{formatearFecha(pago.vencimiento)}</p>
        <p className="font-medium tabular-nums">{formatearImporte(pago.monto, viaje.moneda)}</p>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-1">
        <Label htmlFor="fecha-cobro">Fecha efectiva del cobro</Label>
        <Input
          id="fecha-cobro"
          type="date"
          value={fecha}
          onChange={(evento) => {
            setFecha(evento.target.value);
          }}
        />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Forma de pago</p>
        <Opciones
          nombre="Forma de pago"
          opciones={Object.keys(ETIQUETA_FORMA_PAGO) as FormaPago[]}
          etiqueta={(opcion) => ETIQUETA_FORMA_PAGO[opcion]}
          valor={forma}
          elegir={setForma}
        />
        <p className="text-xs text-muted-foreground">
          Las billeteras virtuales se registran como transferencia.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Moneda del cobro</p>
        <Opciones
          nombre="Moneda del cobro"
          opciones={MONEDAS}
          etiqueta={(opcion) => opcion}
          valor={moneda}
          elegir={setMoneda}
        />
      </div>
      {otraMoneda && (
        <div className="flex flex-col gap-1">
          <Label htmlFor="tipo-cambio">Tipo de cambio</Label>
          <Input
            id="tipo-cambio"
            inputMode="decimal"
            value={tipoDeCambio}
            onChange={(evento) => {
              setTipoDeCambio(evento.target.value);
            }}
          />
          {cambioValido && (
            <p className="text-sm">
              Monto cobrado:{" "}
              <span className="font-medium tabular-nums">
                {formatearImporte(montoCobrado(pago.monto, moneda, Number(cambio)), moneda)}
              </span>
            </p>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={registrar.isPending}>
          Registrar cobro
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={cerrar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
