import type { Cotizacion, Oportunidad } from "@rumbo/shared";
import { useCotizaciones, useDestinos, useViajes } from "@rumbo/shared/hooks";
import type { AxiosInstance } from "axios";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { DialogoReserva } from "./DialogoReserva";

/**
 * Confirmar la reserva desde la oportunidad (CU-07, RF-032): se ofrece con una cotización aceptada
 * o, en la venta directa (A1), con la oportunidad ganada sin ninguna cotización. Una perdida no.
 */
export function ConfirmarReserva({
  cliente,
  oportunidad,
}: {
  cliente: AxiosInstance;
  oportunidad: Oportunidad;
}) {
  const { data: cotizaciones } = useCotizaciones(cliente, oportunidad.id, { por_pagina: 100 });
  if (!cotizaciones || oportunidad.estado === "perdida") return null;

  const aceptada = cotizaciones.items.findLast((c) => c.estado === "aceptada");
  const ventaDirecta = oportunidad.estado === "ganada" && !aceptada;
  if (!aceptada && !ventaDirecta) return null;

  return <ReservaConfirmable cliente={cliente} oportunidad={oportunidad} aceptada={aceptada} />;
}

function ReservaConfirmable({
  cliente,
  oportunidad,
  aceptada,
}: {
  cliente: AxiosInstance;
  oportunidad: Oportunidad;
  aceptada?: Cotizacion;
}) {
  const [abierto, setAbierto] = useState(false);
  // El botón espera al catálogo de destinos (el diálogo lo necesita al abrirse) y a saber si ya hay viaje.
  const { data: destinos } = useDestinos(cliente, { por_pagina: 100 });
  const { data: viajes } = useViajes(cliente, {
    cliente_id: oportunidad.cliente_id,
    por_pagina: 100,
  });
  if (!destinos || !viajes) return null;

  const viaje = viajes.items.find((v) => v.oportunidad_id === oportunidad.id);
  if (viaje) {
    return (
      <Link to={`/viajes/${viaje.id}`} className="text-sm font-medium underline">
        Ver viaje
      </Link>
    );
  }
  return abierto ? (
    <DialogoReserva
      cliente={cliente}
      oportunidad={oportunidad}
      aceptada={aceptada}
      destinos={destinos.items}
      alCerrar={() => {
        setAbierto(false);
      }}
    />
  ) : (
    <Button
      onClick={() => {
        setAbierto(true);
      }}
    >
      Confirmar reserva
    </Button>
  );
}
