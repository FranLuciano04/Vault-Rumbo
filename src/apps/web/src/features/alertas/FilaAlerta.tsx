import { ETIQUETA_TIPO_ALERTA, formatearFecha, type Alerta } from "@rumbo/shared";
import { usePosponerAlerta } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { Check, Clock, Eye } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mensajeDeError } from "@/lib/errores";
import { diasDeAtraso } from "./fechas";

/** Viaje, oportunidad y cliente de la alerta, sin repetir lo que la descripción ya nombra. */
function lineaDeContexto({ contexto, descripcion }: Alerta): string {
  return [
    contexto.viaje && { prefijo: "Viaje: ", nombre: contexto.viaje.destino },
    contexto.oportunidad && {
      prefijo: "Oportunidad: ",
      nombre: contexto.oportunidad.destino_consultado,
    },
    contexto.cliente && { prefijo: "", nombre: contexto.cliente.nombre },
  ]
    .flatMap((parte) =>
      parte && !descripcion.includes(parte.nombre) ? [`${parte.prefijo}${parte.nombre}`] : [],
    )
    .join(" · ");
}

function Plazo({ fecha, hoy }: { fecha: string; hoy: string }) {
  if (fecha === hoy) return null;
  const atraso = diasDeAtraso(fecha, hoy);
  if (atraso <= 0)
    return <span className="text-xs text-muted-foreground">{formatearFecha(fecha)}</span>;
  return (
    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
      Hace {atraso} {atraso === 1 ? "día" : "días"}
    </span>
  );
}

function FormularioPosponer({
  cliente,
  alerta,
  alCerrar,
}: {
  cliente: AxiosInstance;
  alerta: Alerta;
  alCerrar: () => void;
}) {
  const [fecha, setFecha] = useState("");
  const posponer = usePosponerAlerta(cliente);
  return (
    <form
      className="mt-2 flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        posponer.mutate({ id: alerta.id, fecha }, { onSuccess: alCerrar });
      }}
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor={`posponer-${alerta.id}`}>Nueva fecha</Label>
        <Input
          id={`posponer-${alerta.id}`}
          type="date"
          required
          className="h-9 w-44"
          value={fecha}
          onChange={(e) => {
            setFecha(e.target.value);
          }}
        />
      </div>
      <Button type="submit" size="sm" disabled={!fecha || posponer.isPending}>
        Confirmar
      </Button>
      <Button size="sm" variant="ghost" onClick={alCerrar}>
        Cancelar
      </Button>
      {posponer.isError && (
        <p role="alert" className="w-full text-sm text-destructive">
          {mensajeDeError(posponer.error)}
        </p>
      )}
    </form>
  );
}

/**
 * Una alerta de la agenda (CU-14, pantalla 3): tipo, descripción, contexto y, para admin y dueño,
 * su responsable. La de un pago no se resuelve a mano: remite al cobro (A2).
 */
export function FilaAlerta({
  cliente,
  alerta,
  hoy,
  mostrarResponsable,
  alResolver,
  alMarcarVista,
}: {
  cliente: AxiosInstance;
  alerta: Alerta;
  hoy: string;
  mostrarResponsable: boolean;
  alResolver: () => void;
  alMarcarVista: () => void;
}) {
  const [posponiendo, setPosponiendo] = useState(false);
  const esPago = alerta.tipo === "pago";
  const detalle = [lineaDeContexto(alerta), mostrarResponsable && alerta.responsable.nombre]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="rounded-xl px-3 py-3 hover:bg-muted/50">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {ETIQUETA_TIPO_ALERTA[alerta.tipo]}
          </p>
          <p className="font-medium">{alerta.descripcion}</p>
          {detalle && <p className="text-sm text-muted-foreground">{detalle}</p>}
          {esPago && (
            <p className="text-sm text-muted-foreground">Se resuelve al registrar el cobro.</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Plazo fecha={alerta.fecha} hoy={hoy} />
          {!esPago && (
            <Button size="sm" variant="outline" aria-label="Resolver" onClick={alResolver}>
              <Check aria-hidden="true" />
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            aria-label="Posponer"
            onClick={() => {
              setPosponiendo(true);
            }}
          >
            <Clock aria-hidden="true" />
          </Button>
          {alerta.estado === "pendiente" && (
            <Button
              size="sm"
              variant="ghost"
              aria-label="Marcar como vista"
              onClick={alMarcarVista}
            >
              <Eye aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
      {posponiendo && (
        <FormularioPosponer
          cliente={cliente}
          alerta={alerta}
          alCerrar={() => {
            setPosponiendo(false);
          }}
        />
      )}
    </li>
  );
}
