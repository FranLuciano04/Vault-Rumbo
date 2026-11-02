import {
  ETIQUETA_ESTADO_OPORTUNIDAD,
  ETIQUETA_ESTADO_VIAJE,
  formatearFecha,
  type Alerta,
} from "@rumbo/shared";
import { useCliente, useEditarCliente, useHistorialCliente } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Link } from "react-router";
import { Button, variantesBoton } from "@/components/ui/button";
import { mensajeDeError } from "@/lib/errores";
import { FormularioPosponer } from "./FormularioPosponer";

type ClienteDeAlerta = NonNullable<Alerta["contexto"]["cliente"]>;
type Decision = "no_recontactar" | "posponer" | null;

function HistorialResumido({ cliente, clienteId }: { cliente: AxiosInstance; clienteId: string }) {
  const historial = useHistorialCliente(cliente, clienteId);
  if (historial.isPending) return <p role="status">Cargando historial…</p>;
  if (historial.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        No pudimos cargar el historial. Probá de nuevo en unos minutos.
      </p>
    );
  }
  const { viajes, oportunidades } = historial.data;
  if (viajes.length === 0 && oportunidades.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin viajes ni consultas anteriores.</p>;
  }
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {viajes.map((viaje) => (
        <li key={viaje.id}>
          Viaje {formatearFecha(viaje.fecha_salida)} al {formatearFecha(viaje.fecha_regreso)} ·{" "}
          <span className="text-muted-foreground">{ETIQUETA_ESTADO_VIAJE[viaje.estado]}</span>
        </li>
      ))}
      {oportunidades.map((oportunidad) => (
        <li key={oportunidad.id}>
          Consulta {oportunidad.destino_consultado ?? "sin destino"} ·{" "}
          <span className="text-muted-foreground">
            {ETIQUETA_ESTADO_OPORTUNIDAD[oportunidad.estado]}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Sugerencia de recontacto (CU-30 pasos 3 a 5, pantalla 7): el contexto del cliente y las tres
 * decisiones: crear una consulta (A2), no recontactar (A1) o posponer (A3).
 */
export function TarjetaRecontacto({
  cliente,
  alerta,
  clienteDeAlerta,
  hoy,
  alResolver,
}: {
  cliente: AxiosInstance;
  alerta: Alerta;
  clienteDeAlerta: ClienteDeAlerta;
  hoy: string;
  alResolver: () => void;
}) {
  const [decision, setDecision] = useState<Decision>(null);
  const ficha = useCliente(cliente, clienteDeAlerta.id);
  const editar = useEditarCliente(cliente);

  // El opt-out va primero: si el servidor lo rechaza, la alerta queda sin resolver.
  const noRecontactar = () => {
    editar.mutate(
      { id: clienteDeAlerta.id, cambios: { no_recontactar: true } },
      { onSuccess: alResolver },
    );
  };
  const elegir = (nueva: Decision) => {
    editar.reset();
    setDecision(nueva);
  };

  return (
    <section
      aria-labelledby="sugerencia-recontacto"
      className="flex flex-col gap-3 rounded-2xl border bg-card p-4"
      onKeyDown={(e) => {
        // Escape cierra primero la decisión abierta; el panel se cierra con el siguiente.
        if (e.key === "Escape" && decision) {
          e.stopPropagation();
          elegir(null);
        }
      }}
    >
      <h3 id="sugerencia-recontacto" className="text-sm font-semibold">
        Sugerencia de recontacto
      </h3>
      <p className="text-base font-medium">{clienteDeAlerta.nombre}</p>
      {ficha.data?.preferencias && (
        <p className="text-sm text-muted-foreground">{ficha.data.preferencias}</p>
      )}
      <HistorialResumido cliente={cliente} clienteId={clienteDeAlerta.id} />
      <div className="flex flex-wrap gap-2">
        <Link
          to={`/oportunidades/nueva?cliente_id=${clienteDeAlerta.id}&alerta_id=${alerta.id}`}
          className={variantesBoton({ size: "sm" })}
        >
          Crear consulta
        </Link>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            elegir("no_recontactar");
          }}
        >
          No recontactar
        </Button>
        {alerta.estado === "pendiente" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              elegir("posponer");
            }}
          >
            Posponer
          </Button>
        )}
      </div>
      {decision === "no_recontactar" && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="w-full text-sm">
            El cliente no volverá a recibir sugerencias de recontacto. ¿Confirmás?
          </p>
          <Button size="sm" disabled={editar.isPending} onClick={noRecontactar}>
            Confirmar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              elegir(null);
            }}
          >
            Cancelar
          </Button>
          {editar.error && (
            <p role="alert" className="w-full text-sm text-destructive">
              {mensajeDeError(editar.error)}
            </p>
          )}
        </div>
      )}
      {decision === "posponer" && (
        <FormularioPosponer
          cliente={cliente}
          alerta={alerta}
          hoy={hoy}
          alCerrar={() => {
            elegir(null);
          }}
        />
      )}
    </section>
  );
}
