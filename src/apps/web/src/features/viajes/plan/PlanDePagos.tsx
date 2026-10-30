import { formatearFecha, formatearImporte, type Pago, type Viaje } from "@rumbo/shared";
import { usePagos } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { aCentesimas } from "../calculos";
import { EditorDelPlan } from "./EditorDelPlan";
import { ETIQUETA_ESTADO_PAGO, ETIQUETA_TIPO_PAGO, estaSinCobrar } from "./etiquetas";
import { PanelDePago, type AccionDePago } from "./PanelDePago";

const AVISO_REBALANCEO =
  "El precio de venta cambió y los pagos ya no lo suman: rebalanceá el plan de pagos.";

const ACCIONES: { tipo: AccionDePago["tipo"]; texto: string }[] = [
  { tipo: "reprogramar", texto: "Reprogramar" },
  { tipo: "dividir", texto: "Dividir" },
  { tipo: "anular", texto: "Anular" },
];

/** Los pagos vigentes (sin anular) tienen que sumar el precio de venta (CU-11 A5). */
const sumaElPrecio = (pagos: Pago[], precioVenta: string) =>
  pagos
    .filter((p) => p.estado !== "anulado")
    .reduce((total, p) => total + aCentesimas(p.monto), 0n) === aCentesimas(precioVenta);

function FilaPago({
  pago,
  moneda,
  editable,
  elegir,
}: {
  pago: Pago;
  moneda: Viaje["moneda"];
  editable: boolean;
  elegir: (tipo: AccionDePago["tipo"]) => void;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
      <div className={pago.estado === "anulado" ? "line-through" : undefined}>
        <p className="text-sm font-medium text-foreground">{ETIQUETA_TIPO_PAGO[pago.tipo]}</p>
        <p className="text-sm tabular-nums">{formatearFecha(pago.vencimiento)}</p>
      </div>
      <p className="text-sm font-medium tabular-nums">{formatearImporte(pago.monto, moneda)}</p>
      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
        {ETIQUETA_ESTADO_PAGO[pago.estado]}
      </span>
      {editable && estaSinCobrar(pago.estado) && (
        <div className="flex gap-2">
          {ACCIONES.map(({ tipo, texto }) => (
            <Button
              key={tipo}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                elegir(tipo);
              }}
            >
              {texto}
            </Button>
          ))}
        </div>
      )}
    </li>
  );
}

/**
 * Plan de pagos de la ficha del viaje (CU-11, pantalla 15): lista de pagos con su estado, editor con
 * la suma controlada en vivo y las acciones reprogramar, dividir y anular por pago. Con `editable`
 * en falso (freelance, viaje finalizado o cancelado) es de solo lectura.
 */
export function PlanDePagos({
  cliente,
  viaje,
  editable,
}: {
  cliente: AxiosInstance;
  viaje: Viaje;
  editable: boolean;
}) {
  const pagos = usePagos(cliente, viaje.id);
  const [editando, setEditando] = useState(false);
  const [accion, setAccion] = useState<AccionDePago | null>(null);

  if (pagos.isPending) return <p role="status">Cargando plan de pagos…</p>;
  if (pagos.isError) {
    return (
      <div role="alert" className="flex items-center gap-3">
        <p>No pudimos cargar el plan de pagos. Probá de nuevo en unos minutos.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void pagos.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const lista = [...pagos.data].sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));

  if (editando) {
    return (
      <EditorDelPlan
        cliente={cliente}
        viaje={viaje}
        pagos={lista}
        cerrar={() => {
          setEditando(false);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {!sumaElPrecio(lista, viaje.precio_venta) && (
        <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {AVISO_REBALANCEO}
        </p>
      )}
      {lista.length === 0 ? (
        <p>Todavía no hay un plan de pagos definido.</p>
      ) : (
        <ul aria-label="Pagos del viaje" className="flex flex-col gap-3">
          {lista.map((pago) => (
            <FilaPago
              key={pago.id}
              pago={pago}
              moneda={viaje.moneda}
              editable={editable}
              elegir={(tipo) => {
                setAccion({ tipo, pago });
              }}
            />
          ))}
        </ul>
      )}
      {accion && editable && (
        <PanelDePago
          key={`${accion.tipo}-${accion.pago.id}`}
          cliente={cliente}
          viaje={viaje}
          accion={accion}
          cerrar={() => {
            setAccion(null);
          }}
        />
      )}
      {editable && (
        <Button
          type="button"
          className="self-start"
          onClick={() => {
            setAccion(null);
            setEditando(true);
          }}
        >
          Editar plan
        </Button>
      )}
    </div>
  );
}
