import type { Cotizacion, ReservaConfirmada } from "@rumbo/shared";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";

type Motivo = ReservaConfirmada["advertencias_itinerario"][number]["motivo"];

const MOTIVO: Record<Motivo, string> = {
  fuera_de_fechas: "queda fuera de las fechas del viaje",
  superpuesto: "se superpone con otro tramo del itinerario",
  hotel_cerrado: "el hotel está cerrado",
};

/**
 * El backend recorre los ítems en orden y omite uno por advertencia: cada advertencia toma el
 * siguiente ítem de la cotización con ese hotel, así dos estadías en el mismo hotel se distinguen.
 */
function nombresDeHoteles(reserva: ReservaConfirmada, aceptada?: Cotizacion) {
  const usados = new Set<number>();
  return reserva.advertencias_itinerario.map((advertencia) => {
    const posicion =
      aceptada?.items.findIndex(
        (item, i) => item.hotel_id === advertencia.hotel_id && !usados.has(i),
      ) ?? -1;
    if (posicion < 0) return "Un hotel";
    usados.add(posicion);
    return aceptada?.items[posicion]?.concepto ?? "Un hotel";
  });
}

/**
 * Aviso de los hoteles de la cotización que no entraron al itinerario al confirmar la reserva
 * (CU-07 A4, RF-036). El viaje ya se creó: el botón lleva a su ficha.
 */
export function AvisoHotelesOmitidos({
  reserva,
  aceptada,
}: {
  reserva: ReservaConfirmada;
  aceptada?: Cotizacion;
}) {
  const navegar = useNavigate();
  const irAlViaje = useRef<HTMLButtonElement>(null);
  // El diálogo de la reserva se desmonta y el foco quedaría en el body.
  useEffect(() => {
    irAlViaje.current?.focus();
  }, []);
  const nombres = nombresDeHoteles(reserva, aceptada);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
      <div role="alert" className="flex flex-col gap-2 text-sm">
        <p className="font-medium">
          La reserva se confirmó, pero algunos hoteles no entraron al itinerario:
        </p>
        <ul className="list-disc pl-5">
          {reserva.advertencias_itinerario.map((advertencia, indice) => (
            // La lista no tiene id propio y puede repetir el hotel: la posición es su identidad.
            <li key={indice}>
              {nombres[indice]}: {MOTIVO[advertencia.motivo]}.
            </li>
          ))}
        </ul>
      </div>
      <Button
        ref={irAlViaje}
        className="self-start"
        onClick={() => {
          void navegar(`/viajes/${reserva.id}`);
        }}
      >
        Ir al viaje
      </Button>
    </div>
  );
}
