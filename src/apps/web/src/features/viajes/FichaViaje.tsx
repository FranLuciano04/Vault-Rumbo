import {
  ErrorApi,
  ETIQUETA_ESTADO_VIAJE,
  formatearFecha,
  formatearImporte,
  formatearPorcentaje,
  type UsuarioActual,
} from "@rumbo/shared";
import { useCliente, useDestino, useViaje } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import type { ReactNode } from "react";
import { ItinerarioViaje } from "./itinerario/ItinerarioViaje";
import { PlanDePagos } from "./plan/PlanDePagos";
import { SeccionEconomia } from "./SeccionEconomia";

const ESTADOS_SIN_EDICION = ["finalizado", "cancelado"];

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="rounded-2xl border bg-card p-5">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <div className="mt-2 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

/**
 * Ficha del viaje (CU-08, CU-10, pantallas 15 y 43): encabezado, economía editable y el lugar del
 * plan de pagos, el itinerario y las acciones, que llegan en sus propios tickets. El freelance y los
 * viajes finalizados o cancelados ven la economía en solo lectura.
 */
export function FichaViaje({
  cliente,
  usuario,
  viajeId,
}: {
  cliente: AxiosInstance;
  usuario: UsuarioActual;
  viajeId: string;
}) {
  const { data: viaje, isPending, isError, error } = useViaje(cliente, viajeId);
  const { data: titular } = useCliente(cliente, viaje?.cliente_id ?? "");
  const { data: destino } = useDestino(cliente, viaje?.destino_id ?? "");

  if (isPending) return <p role="status">Cargando viaje…</p>;
  if (isError) {
    const noExiste = error instanceof ErrorApi && error.status === 404;
    return (
      <p role="alert">
        {noExiste
          ? "No encontramos el viaje. Puede que ya no exista o que no lo puedas ver."
          : "No pudimos cargar el viaje. Probá de nuevo en unos minutos."}
      </p>
    );
  }

  const editable = usuario.rol !== "freelance" && !ESTADOS_SIN_EDICION.includes(viaje.estado);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Viajes / Ficha
          </p>
          <h1 className="text-3xl font-semibold">{destino?.nombre ?? "Viaje"}</h1>
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
          {ETIQUETA_ESTADO_VIAJE[viaje.estado]}
        </span>
      </header>

      <dl className="grid grid-cols-2 gap-4 rounded-2xl border bg-card px-5 py-4 md:grid-cols-4">
        <Dato etiqueta="Cliente">{titular?.nombre}</Dato>
        <Dato etiqueta="Fechas">
          {formatearFecha(viaje.fecha_salida)} → {formatearFecha(viaje.fecha_regreso)}
        </Dato>
        <Dato etiqueta="Saldo pendiente">
          {formatearImporte(viaje.saldo_pendiente, viaje.moneda)}
        </Dato>
        <Dato etiqueta="Pagado">{formatearPorcentaje(viaje.porcentaje_pagado)}</Dato>
      </dl>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <Seccion titulo="Plan de pagos">
            <PlanDePagos cliente={cliente} viaje={viaje} editable={editable} />
          </Seccion>
          <Seccion titulo="Itinerario">
            <ItinerarioViaje cliente={cliente} viaje={viaje} editable={editable} />
          </Seccion>
          <Seccion titulo="Acciones">Los cambios de estado del viaje se hacen desde acá.</Seccion>
        </div>
        <SeccionEconomia cliente={cliente} usuario={usuario} viaje={viaje} editable={editable} />
      </div>
    </div>
  );
}
